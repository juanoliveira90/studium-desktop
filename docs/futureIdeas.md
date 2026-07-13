# Future ideas

Features considered and deliberately deferred — not scheduled, just not forgotten.

## Schedule: drag-to-select when creating a block

Clicking an empty grid cell creates a 1-hour event at that half-hour (Google
Calendar style, added 2026-07). Google Calendar additionally lets you press
and drag vertically over the grid to choose the duration while creating: the
event's start is where the press began, the end follows the pointer (snapping
to the half-hour rows), and releasing opens the same prefilled form. Deferred
to keep the first version click-only; needs pointer capture over `.cell`
elements and a live preview block while dragging.
