# 0002 — why Vec everywhere in the Rust side

2026-07-07

Not really a "decision", more a why-is-the-code-like-this note.

Vec = growable array: pointer + length + capacity on the stack, elements on
the heap, freed when it drops. The stack alternative (`[T; N]`) needs N at
compile time — and nothing the vault returns has a compile-time size:

- `Vault::list` → `Vec<String>`: how many .md files are in notes/? depends
  on the vault, today.
- `Document::parse_all` → `Vec<Document>`: how many blocks in schedule.md?
  6 in the sample vault, 0 in a fresh one.
- `schedule_list` → `Vec<ScheduleEntry>`, watcher events → `Vec<String>`
  of changed paths. Same story.

So the data has to live on the heap, and Vec is the owning handle for that.

## The other reasons it's the right default here

- **Ownership across boundaries.** `read_all` builds a collection and gives
  it away — to commands.rs, then to serde. A borrowed `&[Document]` can't do
  that; someone has to own the elements. Returning Vec hands ownership over
  with zero lifetime gymnastics.
- **Built by pushing.** `parse_all` loops over an unknown number of fences
  doing `docs.push(doc)`; `collect_markdown` recurses pushing paths. Push is
  amortized O(1) (Vec over-allocates and doubles when full).
- **Order matters.** Blocks keep file order (the frontend says "block 3 is
  broken" by index) and `list` returns sorted paths. HashMap/HashSet would
  throw the ordering away.
- **Cheap at our scale.** Contiguous = cache-friendly, and N is dozens of
  blocks / hundreds of notes. Nothing hot enough for allocation to matter.

## Where we deliberately don't use it

Borrow when you can, own when the data must outlive its source or grow:
`&rest[offset..]` slices borrow instead of allocating, `read_to_string`
returns one String, and WEEKDAYS on the TS side is a fixed 7-element array.
An I/O layer mostly needs owning — that's why Vec shows up everywhere there.
