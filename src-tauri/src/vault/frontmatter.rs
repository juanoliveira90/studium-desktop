//! A markdown document split into an optional YAML frontmatter block and a
//! body. The parsed form keeps the frontmatter's raw text, so a document that
//! is never edited serializes back byte-identical — comments, key order,
//! quoting and all. Edits go through [`Document::set_frontmatter`], which
//! rewrites only the frontmatter block (keys in insertion order, ambiguous
//! scalars like `"09:30"` always quoted) and never touches the body.

use std::fmt;

use serde_yaml::{Mapping, Value};

use super::error::VaultError;

#[derive(Debug, Clone)]
pub struct Document {
    /// The full frontmatter block including both `---` fences, exactly as it
    /// appeared in (or will be written to) the file. `None` when the document
    /// has no frontmatter.
    raw_block: Option<String>,
    body: String,
}

impl Document {
    /// Splits `input` into frontmatter and body. Never fails: a file that
    /// doesn't open with a closed `---` fence is all body, and YAML errors
    /// are deferred to [`Document::frontmatter`] so broken files still
    /// round-trip untouched.
    pub fn parse(input: &str) -> Document {
        if let Some(rest) = input.strip_prefix("---\n") {
            let mut offset = 0;
            loop {
                let line_end = rest[offset..].find('\n').map(|i| offset + i);
                let line = match line_end {
                    Some(end) => &rest[offset..end],
                    None => &rest[offset..],
                };
                if line == "---" {
                    let block_end = match line_end {
                        Some(end) => end + 1,
                        None => rest.len(),
                    };
                    return Document {
                        raw_block: Some(format!("---\n{}", &rest[..block_end])),
                        body: rest[block_end..].to_string(),
                    };
                }
                match line_end {
                    Some(end) => offset = end + 1,
                    None => break,
                }
            }
        }
        Document {
            raw_block: None,
            body: input.to_string(),
        }
    }

    pub fn body(&self) -> &str {
        &self.body
    }

    pub fn set_body(&mut self, body: String) {
        self.body = body;
    }

    /// The frontmatter parsed as a YAML mapping (empty if absent). Malformed
    /// YAML and non-mapping frontmatter report as [`VaultError::Frontmatter`].
    pub fn frontmatter(&self) -> Result<Mapping, VaultError> {
        let Some(block) = &self.raw_block else {
            return Ok(Mapping::new());
        };
        let inner = block
            .strip_prefix("---\n")
            .and_then(|s| s.strip_suffix("---\n").or_else(|| s.strip_suffix("---")))
            .unwrap_or(block);
        match serde_yaml::from_str::<Value>(inner) {
            Ok(Value::Null) => Ok(Mapping::new()),
            Ok(Value::Mapping(mapping)) => Ok(mapping),
            Ok(other) => Err(VaultError::Frontmatter {
                message: format!("expected a mapping, found {}", value_kind(&other)),
            }),
            Err(err) => Err(VaultError::Frontmatter {
                message: err.to_string(),
            }),
        }
    }

    /// Replaces the frontmatter block, keeping keys in the mapping's
    /// insertion order. An empty mapping removes the block entirely.
    pub fn set_frontmatter(&mut self, frontmatter: Mapping) {
        if frontmatter.is_empty() {
            self.raw_block = None;
        } else {
            self.raw_block = Some(format!("---\n{}---\n", emit_mapping(&frontmatter, 0)));
        }
    }
}

impl fmt::Display for Document {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if let Some(block) = &self.raw_block {
            f.write_str(block)?;
        }
        f.write_str(&self.body)
    }
}

fn value_kind(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "a boolean",
        Value::Number(_) => "a number",
        Value::String(_) => "a string",
        Value::Sequence(_) => "a sequence",
        Value::Mapping(_) => "a mapping",
        Value::Tagged(_) => "a tagged value",
    }
}

// --- YAML emitter ----------------------------------------------------------
//
// serde_yaml's emitter leaves scalars like `09:30` unquoted, which YAML 1.1
// tools (and Obsidian's parser in some modes) misread as sexagesimal numbers.
// The vault format promises times are always quoted, so we emit the small
// YAML subset we write ourselves: block mappings/sequences and scalars, with
// any string that isn't unambiguously plain double-quoted.

const INDENT: &str = "  ";

fn emit_mapping(map: &Mapping, depth: usize) -> String {
    let mut out = String::new();
    for (key, value) in map {
        let key = emit_scalar_string(key.as_str().unwrap_or_default());
        match value {
            Value::Mapping(nested) if !nested.is_empty() => {
                push_line(&mut out, depth, &format!("{key}:"));
                out.push_str(&emit_mapping(nested, depth + 1));
            }
            Value::Sequence(items) if !items.is_empty() => {
                push_line(&mut out, depth, &format!("{key}:"));
                out.push_str(&emit_sequence(items, depth + 1));
            }
            scalar => push_line(&mut out, depth, &format!("{key}: {}", emit_scalar(scalar))),
        }
    }
    out
}

fn emit_sequence(items: &[Value], depth: usize) -> String {
    let mut out = String::new();
    for item in items {
        match item {
            Value::Mapping(map) if !map.is_empty() => {
                // First entry rides on the dash line, the rest align under it.
                let rendered = emit_mapping(map, 0);
                for (i, line) in rendered.lines().enumerate() {
                    if i == 0 {
                        push_line(&mut out, depth, &format!("- {line}"));
                    } else {
                        push_line(&mut out, depth + 1, line);
                    }
                }
            }
            Value::Sequence(nested) if !nested.is_empty() => {
                push_line(&mut out, depth, "-");
                out.push_str(&emit_sequence(nested, depth + 1));
            }
            scalar => push_line(&mut out, depth, &format!("- {}", emit_scalar(scalar))),
        }
    }
    out
}

fn push_line(out: &mut String, depth: usize, line: &str) {
    for _ in 0..depth {
        out.push_str(INDENT);
    }
    out.push_str(line);
    out.push('\n');
}

fn emit_scalar(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => emit_scalar_string(s),
        // Empty containers reach here from the container arms' guards.
        Value::Mapping(_) => "{}".to_string(),
        Value::Sequence(_) => "[]".to_string(),
        Value::Tagged(_) => serde_yaml::to_string(value)
            .unwrap_or_default()
            .trim_end()
            .to_string(),
    }
}

fn emit_scalar_string(s: &str) -> String {
    if is_plain_safe(s) {
        s.to_string()
    } else {
        double_quote(s)
    }
}

/// True when a string can be written as a plain YAML scalar without any
/// parser (1.1 or 1.2) reading it back as something else: starts with a
/// letter or underscore, uses a conservative character set, and isn't a
/// reserved word like `true` or `null`.
fn is_plain_safe(s: &str) -> bool {
    let Some(first) = s.chars().next() else {
        return false;
    };
    if !(first.is_ascii_alphabetic() || first == '_') {
        return false;
    }
    if s.ends_with(' ') {
        return false;
    }
    if !s
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '_' | '-' | '.' | '/'))
    {
        return false;
    }
    !matches!(
        s.to_ascii_lowercase().as_str(),
        "true" | "false" | "null" | "yes" | "no" | "on" | "off"
    )
}

fn double_quote(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\t' => out.push_str("\\t"),
            '\r' => out.push_str("\\r"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
