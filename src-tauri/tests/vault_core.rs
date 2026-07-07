//! Integration tests for the vault core: frontmatter round-trip, atomic
//! writes, vault open/create, doc listing/read/write, app config, watcher.

use std::fs;
use std::path::Path;
use std::time::Duration;

use studium_desktop_lib::config::AppConfig;
use studium_desktop_lib::vault::{atomic_write, Document, Vault, VaultError, VaultWatcher};

fn sample_vault_dir() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../sample-vault")
}

// ---------------------------------------------------------------- frontmatter

#[test]
fn parse_plain_markdown_has_no_frontmatter() {
    let doc = Document::parse("# Hello\n\nBody text.\n");
    assert!(doc.frontmatter().unwrap().is_empty());
    assert_eq!(doc.body(), "# Hello\n\nBody text.\n");
    assert_eq!(doc.to_string(), "# Hello\n\nBody text.\n");
}

#[test]
fn parse_standard_frontmatter() {
    let src = "---\ntitle: Integrals\ntags:\n  - lecture\n---\n# Notes\n";
    let doc = Document::parse(src);
    let fm = doc.frontmatter().unwrap();
    assert_eq!(
        fm.get("title").and_then(|v| v.as_str()),
        Some("Integrals")
    );
    assert_eq!(doc.body(), "# Notes\n");
}

#[test]
fn round_trip_is_byte_identical_including_comments_and_order() {
    let src = "---\n# a comment that must survive\nzeta: 1\nalpha: 2\n---\nbody\n";
    assert_eq!(Document::parse(src).to_string(), src);
}

#[test]
fn round_trip_empty_frontmatter_block() {
    let src = "---\n---\nbody\n";
    assert_eq!(Document::parse(src).to_string(), src);
}

#[test]
fn unclosed_fence_is_treated_as_body() {
    let src = "---\nnot: closed\n";
    let doc = Document::parse(src);
    assert!(doc.frontmatter().unwrap().is_empty());
    assert_eq!(doc.body(), src);
    assert_eq!(doc.to_string(), src);
}

#[test]
fn horizontal_rules_in_body_are_not_fences() {
    let src = "intro\n\n---\n\nmore\n";
    let doc = Document::parse(src);
    assert!(doc.frontmatter().unwrap().is_empty());
    assert_eq!(doc.to_string(), src);
}

#[test]
fn malformed_frontmatter_reports_error_not_panic() {
    let src = "---\n: [unbalanced\n  bad yaml: : :\n---\nbody\n";
    let doc = Document::parse(src);
    assert!(matches!(
        doc.frontmatter(),
        Err(VaultError::Frontmatter { .. })
    ));
    // The raw text still round-trips even though the YAML is broken.
    assert_eq!(doc.to_string(), src);
}

#[test]
fn set_frontmatter_preserves_body_and_key_order() {
    let src = "---\ntitle: old\n---\n# Body stays\n\nexactly as-is.\n";
    let mut doc = Document::parse(src);
    let mut fm = serde_yaml::Mapping::new();
    fm.insert("zebra".into(), "first".into());
    fm.insert("alpha".into(), "second".into());
    doc.set_frontmatter(fm);
    let out = doc.to_string();
    assert_eq!(
        out,
        "---\nzebra: first\nalpha: second\n---\n# Body stays\n\nexactly as-is.\n"
    );
}

#[test]
fn time_like_strings_are_written_quoted() {
    let mut doc = Document::parse("");
    let mut fm = serde_yaml::Mapping::new();
    fm.insert("start".into(), "09:30".into());
    fm.insert("end".into(), "11:00".into());
    doc.set_frontmatter(fm);
    let out = doc.to_string();
    assert!(out.contains("start: \"09:30\""), "got: {out}");
    assert!(out.contains("end: \"11:00\""), "got: {out}");
    // And it parses back to the same strings.
    let fm = Document::parse(&out).frontmatter().unwrap();
    assert_eq!(fm.get("start").and_then(|v| v.as_str()), Some("09:30"));
}

#[test]
fn ambiguous_scalars_are_quoted_but_plain_strings_are_not() {
    let mut doc = Document::parse("");
    let mut fm = serde_yaml::Mapping::new();
    fm.insert("name".into(), "Calculus II".into());
    fm.insert("looks_bool".into(), "true".into());
    fm.insert("looks_num".into(), "42".into());
    fm.insert("real_num".into(), serde_yaml::Value::from(42));
    fm.insert("real_bool".into(), serde_yaml::Value::from(true));
    doc.set_frontmatter(fm);
    let out = doc.to_string();
    assert!(out.contains("name: Calculus II"), "got: {out}");
    assert!(out.contains("looks_bool: \"true\""), "got: {out}");
    assert!(out.contains("looks_num: \"42\""), "got: {out}");
    assert!(out.contains("real_num: 42"), "got: {out}");
    assert!(out.contains("real_bool: true"), "got: {out}");
}

#[test]
fn nested_structures_round_trip_through_set_frontmatter() {
    let mut doc = Document::parse("body\n");
    let mut task1 = serde_yaml::Mapping::new();
    task1.insert("name".into(), "u-substitution".into());
    task1.insert("done".into(), serde_yaml::Value::from(true));
    let mut task2 = serde_yaml::Mapping::new();
    task2.insert("name".into(), "parts: the hard ones".into());
    task2.insert("done".into(), serde_yaml::Value::from(false));
    let mut fm = serde_yaml::Mapping::new();
    fm.insert("tag".into(), "integrals".into());
    fm.insert(
        "subtasks".into(),
        serde_yaml::Value::Sequence(vec![task1.into(), task2.into()]),
    );
    doc.set_frontmatter(fm.clone());
    let reparsed = Document::parse(&doc.to_string()).frontmatter().unwrap();
    assert_eq!(reparsed, fm);
    assert_eq!(Document::parse(&doc.to_string()).body(), "body\n");
}

#[test]
fn wiki_links_in_frontmatter_survive() {
    let mut doc = Document::parse("");
    let mut fm = serde_yaml::Mapping::new();
    fm.insert("plan".into(), "[[calculus-ii]]".into());
    doc.set_frontmatter(fm.clone());
    let reparsed = Document::parse(&doc.to_string()).frontmatter().unwrap();
    assert_eq!(
        reparsed.get("plan").and_then(|v| v.as_str()),
        Some("[[calculus-ii]]")
    );
}

// -------------------------------------------------------------- atomic writes

#[test]
fn atomic_write_creates_and_overwrites() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("note.md");
    atomic_write(&path, "first").unwrap();
    assert_eq!(fs::read_to_string(&path).unwrap(), "first");
    atomic_write(&path, "second").unwrap();
    assert_eq!(fs::read_to_string(&path).unwrap(), "second");
}

#[test]
fn atomic_write_leaves_no_temp_files() {
    let dir = tempfile::tempdir().unwrap();
    atomic_write(&dir.path().join("a.md"), "x").unwrap();
    let entries: Vec<_> = fs::read_dir(dir.path())
        .unwrap()
        .map(|e| e.unwrap().file_name().into_string().unwrap())
        .collect();
    assert_eq!(entries, vec!["a.md"]);
}

#[test]
fn atomic_write_missing_parent_errors() {
    let dir = tempfile::tempdir().unwrap();
    let err = atomic_write(&dir.path().join("no/such/dir/a.md"), "x");
    assert!(err.is_err());
}

// ------------------------------------------------------------------- vault

#[test]
fn create_scaffolds_vault_layout() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("vault");
    let vault = Vault::create(&root).unwrap();
    assert_eq!(vault.root(), root.as_path());
    assert!(root.join("notes").is_dir());
    assert!(root.join("plans").is_dir());
    assert!(root.join("schedule.md").is_file());
    assert!(root.join(".studium/config.toml").is_file());
    assert!(root.join(".studium/themes").is_dir());
}

#[test]
fn create_is_idempotent_and_never_clobbers() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("vault");
    Vault::create(&root).unwrap();
    fs::write(root.join("schedule.md"), "my schedule").unwrap();
    Vault::create(&root).unwrap();
    assert_eq!(
        fs::read_to_string(root.join("schedule.md")).unwrap(),
        "my schedule"
    );
}

#[test]
fn open_rejects_non_vault_and_missing_dirs() {
    let dir = tempfile::tempdir().unwrap();
    assert!(matches!(
        Vault::open(dir.path().join("nope")),
        Err(VaultError::NotAVault { .. })
    ));
    let plain = dir.path().join("plain");
    fs::create_dir(&plain).unwrap();
    assert!(matches!(
        Vault::open(&plain),
        Err(VaultError::NotAVault { .. })
    ));
}

#[test]
fn open_accepts_created_vault() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("vault");
    Vault::create(&root).unwrap();
    assert!(Vault::open(&root).is_ok());
}

#[test]
fn list_returns_markdown_files_recursively_sorted() {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::create(dir.path().join("v")).unwrap();
    fs::write(vault.root().join("notes/b.md"), "b").unwrap();
    fs::write(vault.root().join("notes/a.md"), "a").unwrap();
    fs::create_dir_all(vault.root().join("plans/calc/subjects")).unwrap();
    fs::write(vault.root().join("plans/calc/plan.md"), "p").unwrap();
    fs::write(vault.root().join("plans/calc/subjects/x.md"), "x").unwrap();
    fs::write(vault.root().join("notes/not-markdown.txt"), "no").unwrap();

    assert_eq!(vault.list("notes").unwrap(), vec!["notes/a.md", "notes/b.md"]);
    assert_eq!(
        vault.list("plans").unwrap(),
        vec!["plans/calc/plan.md", "plans/calc/subjects/x.md"]
    );
}

#[test]
fn list_skips_hidden_directories() {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::create(dir.path().join("v")).unwrap();
    fs::write(vault.root().join(".studium/sneaky.md"), "no").unwrap();
    assert_eq!(vault.list("").unwrap(), vec!["schedule.md"]);
}

#[test]
fn read_write_round_trip_via_vault() {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::create(dir.path().join("v")).unwrap();
    let src = "---\ntags:\n  - idea\n---\nAn idea.\n";
    fs::write(vault.root().join("notes/idea.md"), src).unwrap();

    let mut doc = vault.read("notes/idea.md").unwrap();
    assert_eq!(doc.body(), "An idea.\n");
    let mut fm = doc.frontmatter().unwrap();
    fm.insert("updated".into(), "2026-07-04".into());
    doc.set_frontmatter(fm);
    vault.write("notes/idea.md", &doc).unwrap();

    let on_disk = fs::read_to_string(vault.root().join("notes/idea.md")).unwrap();
    assert!(on_disk.ends_with("---\nAn idea.\n"), "body preserved: {on_disk}");
    assert!(on_disk.contains("updated: \"2026-07-04\""), "got: {on_disk}");
}

#[test]
fn write_creates_parent_directories() {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::create(dir.path().join("v")).unwrap();
    let doc = Document::parse("new plan\n");
    vault.write("plans/physics/plan.md", &doc).unwrap();
    assert!(vault.root().join("plans/physics/plan.md").is_file());
}

#[test]
fn read_missing_file_is_a_clean_error() {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::create(dir.path().join("v")).unwrap();
    assert!(vault.read("notes/ghost.md").is_err());
}

#[test]
fn path_traversal_is_rejected() {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::create(dir.path().join("v")).unwrap();
    for bad in ["../escape.md", "notes/../../escape.md", "/etc/passwd"] {
        assert!(
            matches!(vault.read(bad), Err(VaultError::InvalidPath { .. })),
            "read should reject {bad}"
        );
        assert!(
            matches!(
                vault.write(bad, &Document::parse("")),
                Err(VaultError::InvalidPath { .. })
            ),
            "write should reject {bad}"
        );
    }
}

// -------------------------------------------------------------- sample vault

#[test]
fn sample_vault_opens_and_every_doc_round_trips() {
    let vault = Vault::open(sample_vault_dir()).unwrap();
    let docs = vault.list("").unwrap();
    assert!(
        docs.iter().any(|p| p.starts_with("notes/")),
        "sample vault has notes"
    );
    assert!(
        docs.iter().any(|p| p.starts_with("plans/")),
        "sample vault has plans"
    );
    assert!(docs.contains(&"schedule.md".to_string()));
    for rel in docs {
        let raw = fs::read_to_string(sample_vault_dir().join(&rel)).unwrap();
        let doc = Document::parse(&raw);
        assert_eq!(doc.to_string(), raw, "{rel} must round-trip byte-identical");
        if rel != "schedule.md" {
            doc.frontmatter()
                .unwrap_or_else(|e| panic!("{rel}: frontmatter must parse: {e}"));
        }
    }
}

// --------------------------------------------------- schedule (multi-doc)

#[test]
fn parse_all_splits_consecutive_frontmatter_blocks() {
    let src = "---\nday: mon\nstart: \"09:30\"\n---\n---\nday: tue\nstart: \"10:00\"\n---\n";
    let docs = Document::parse_all(src);
    assert_eq!(docs.len(), 2);
    let first = docs[0].frontmatter().unwrap();
    assert_eq!(first.get("day").and_then(|v| v.as_str()), Some("mon"));
    assert_eq!(first.get("start").and_then(|v| v.as_str()), Some("09:30"));
    let second = docs[1].frontmatter().unwrap();
    assert_eq!(second.get("day").and_then(|v| v.as_str()), Some("tue"));
}

#[test]
fn parse_all_empty_or_blank_input_has_no_blocks() {
    assert!(Document::parse_all("").is_empty());
}

#[test]
fn parse_all_tolerates_blank_lines_between_blocks() {
    let src = "---\nday: mon\n---\n\n\n---\nday: tue\n---\n";
    let docs = Document::parse_all(src);
    assert_eq!(docs.len(), 2);
    assert_eq!(
        docs[1].frontmatter().unwrap().get("day").and_then(|v| v.as_str()),
        Some("tue")
    );
}

#[test]
fn parse_all_reports_malformed_yaml_per_block() {
    let src = "---\nday: mon\n---\n---\n: [broken\n---\n---\nday: fri\n---\n";
    let docs = Document::parse_all(src);
    assert_eq!(docs.len(), 3);
    assert!(docs[0].frontmatter().is_ok());
    assert!(matches!(
        docs[1].frontmatter(),
        Err(VaultError::Frontmatter { .. })
    ));
    assert_eq!(
        docs[2].frontmatter().unwrap().get("day").and_then(|v| v.as_str()),
        Some("fri")
    );
}

#[test]
fn parse_all_input_without_fences_is_one_body_document() {
    let docs = Document::parse_all("just some text\n");
    assert_eq!(docs.len(), 1);
    assert!(docs[0].frontmatter().unwrap().is_empty());
    assert_eq!(docs[0].body(), "just some text\n");
}

#[test]
fn parse_all_sample_vault_schedule() {
    let raw = fs::read_to_string(sample_vault_dir().join("schedule.md")).unwrap();
    let docs = Document::parse_all(&raw);
    assert_eq!(docs.len(), 6);
    for doc in &docs {
        let fm = doc.frontmatter().unwrap();
        assert!(fm.get("day").is_some(), "every block has a day");
        assert!(fm.get("start").is_some(), "every block has a start");
    }
    assert_eq!(
        docs[0].frontmatter().unwrap().get("plan").and_then(|v| v.as_str()),
        Some("[[calculus-ii]]")
    );
}

#[test]
fn read_all_reads_schedule_blocks_through_the_vault() {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::create(dir.path().join("v")).unwrap();
    fs::write(
        vault.root().join("schedule.md"),
        "---\nday: mon\nstart: \"08:00\"\nend: \"09:00\"\ntitle: run\n---\n",
    )
    .unwrap();
    let docs = vault.read_all("schedule.md").unwrap();
    assert_eq!(docs.len(), 1);
    assert_eq!(
        docs[0].frontmatter().unwrap().get("title").and_then(|v| v.as_str()),
        Some("run")
    );
}

// ------------------------------------------------------------------- config

#[test]
fn app_config_missing_file_loads_default() {
    let dir = tempfile::tempdir().unwrap();
    let cfg = AppConfig::load_from(dir.path()).unwrap();
    assert!(cfg.vault_path.is_none());
}

#[test]
fn app_config_save_load_round_trip() {
    let dir = tempfile::tempdir().unwrap();
    let cfg = AppConfig {
        vault_path: Some("/home/juan/vault".into()),
    };
    cfg.save_to(dir.path()).unwrap();
    let loaded = AppConfig::load_from(dir.path()).unwrap();
    assert_eq!(loaded.vault_path.as_deref(), Some(Path::new("/home/juan/vault")));
}

// ------------------------------------------------------------------ watcher

#[test]
fn watcher_reports_changed_files_as_relative_paths() {
    let dir = tempfile::tempdir().unwrap();
    let vault_root = dir.path().join("v");
    Vault::create(&vault_root).unwrap();
    let (watcher, rx) = VaultWatcher::start(&vault_root).unwrap();
    // Give the OS watcher a beat to register before writing.
    std::thread::sleep(Duration::from_millis(200));
    fs::write(vault_root.join("notes/live.md"), "hello").unwrap();

    let mut seen = Vec::new();
    let deadline = std::time::Instant::now() + Duration::from_secs(5);
    while std::time::Instant::now() < deadline {
        if let Ok(event) = rx.recv_timeout(Duration::from_millis(200)) {
            seen.extend(event.paths);
            if seen.iter().any(|p| p == "notes/live.md") {
                break;
            }
        }
    }
    drop(watcher);
    assert!(
        seen.iter().any(|p| p == "notes/live.md"),
        "expected notes/live.md in {seen:?}"
    );
}

// -------------------------------------------------------------- property tests

mod properties {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        /// Any file at all survives parse → to_string byte-identical.
        #[test]
        fn parse_never_alters_content(src in ".{0,400}") {
            prop_assert_eq!(Document::parse(&src).to_string(), src);
        }

        /// parse_all never loses text: the documents concatenate back to the
        /// exact input, whatever mix of fences, bodies, and junk it holds.
        #[test]
        fn parse_all_concatenation_is_lossless(src in "(---\n)?[a-z:\n \"\\[\\]-]{0,300}") {
            let joined: String = Document::parse_all(&src)
                .iter()
                .map(|d| d.to_string())
                .collect();
            prop_assert_eq!(joined, src);
        }

        /// Arbitrary string frontmatter values survive a full
        /// set_frontmatter → to_string → parse cycle, and the body is untouched.
        #[test]
        fn frontmatter_write_read_round_trip(
            key in "[a-z][a-z0-9_]{0,15}",
            value in "[ -~]{0,60}",
            body in "[a-zA-Z0-9 .\n#*-]{0,200}",
        ) {
            let mut doc = Document::parse(&body);
            let mut fm = serde_yaml::Mapping::new();
            fm.insert(key.as_str().into(), value.as_str().into());
            doc.set_frontmatter(fm);
            let reparsed = Document::parse(&doc.to_string());
            let fm2 = reparsed.frontmatter().unwrap();
            prop_assert_eq!(fm2.get(key.as_str()).and_then(|v| v.as_str()), Some(value.as_str()));
            prop_assert_eq!(reparsed.body(), body.as_str());
        }
    }
}
