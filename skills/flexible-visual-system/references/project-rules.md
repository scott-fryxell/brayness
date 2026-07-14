# Project rules file

The locked output of Intake. The skill reads this before sweeping and writes
back to it when rules change. It is the source of truth for a project's
visual system - not the last render's params.

## Location

The skill searches, in order, and uses the first it finds:

1. `visual-system.md` (project root)
2. `design/visual-system.md`
3. `docs/visual-system.md`

If none exists, it writes to `visual-system.md` at the project root.

Keep it out of the README. A rules file mixed with project docs drifts and
confuses; a dedicated file gives the generator a stable address.

## Format

Markdown. One rule per bullet. Each rule followed by a `why:` line stating the
intent. The `why` is what lets a future you (or the agent) edit intent rather
than blindly mutate a value.

```markdown
# Visual system - <project>

## Module

- Half-disc, filled, no stroke
  why: the wordmark's bowl is a half-disc; reusing it ties every output to the brand mark

## Grid

- 10 x 10 square, cell = viewBox / cols, no gutter
  why: matches the 10-column layout grid; tight tessellation reads as one surface

## Repetition

- Tile (one module per cell)
  why: simplest multiplier; variety comes from transform, not layout

## Transformation

- Rotate by quantized {0, 90, 180, 270}, seeded
  why: 90deg steps echo the logo's 4-fold symmetry; keeps edges clean
- Edge cells bias toward 270deg
  why: pulled edges "outward" in the sweep; encoded rather than hand-nudged

## Color

- Palette: bg #0e0e10, fg #f2f2f2, accent #ff4d2e
  why: pulled from `:root` tokens; accent is the brand's existing signal red
- Accent fires with p=0.2, seeded
  why: sparse enough to read as a highlight, dense enough to feel alive

## Randomness

- Seed drives rotation choice and accent gate
  why: one seed reproduces any output end-to-end

## Keepers

- seed 12, accent_p 0.2 -> poster.svg
  why: cleanest balance of accent density; used as the default OG image
- seed 47, accent_p 0.35 -> header.svg
  why: higher density reads better at small header size

## Notes

- Re-render any keeper by running the generator with these rules + the seed.
- Changing a rule re-sweeps all keepers; verify they still hold.
```

## Reading vs writing

- **Read first.** Every generate / sweep / export call loads the rules file
  before doing anything. If it is missing, run Intake.
- **Write on change.** When tuning moves a knob enough to change intent, or a
  new keeper is locked, append/update the file. The file is the system; the
  renders are its outputs.
- **Keepers carry their seed.** A keeper is only recoverable if its seed +
  params are in the file. Never export a keeper without recording it here.
