# Materials and roles: the recipe

Two layers, never conflated. **Materials** are named swatches (a hue at several
weights). **Roles** are semantic purposes (accent, emphasis, warning) that point
at a material. Components only ever reference roles.

## Why two layers

A hue name lies the moment the value drifts — call a swatch `--blue` and then
retune it toward teal, and every call site now reads a color that doesn't match
its name. A material name (`--water`, `--clay`, whatever fits your project's
character) survives that tuning pass because it was never a claim about the hue
in the first place.

A role separates "what is this color _for_" from "which material currently fills
that job." `--accent` might point at `water` today and something else after a
rebrand — every component reads `--accent` and never needs to know or care which
material is behind it.

## Building one material

Each material is a light/dark/fill triad in `oklch(L C H)`:

- **Light-mode value**: ~35% lightness, ~32–40% saturation/chroma. Dark enough
  to read as text or a strong fill on a light background.
- **Dark-mode value**: the same hue, lightness lifted to ~60–66%. Light enough
  to read on a dark background without blowing out.
- **Mid fill**: a value between the two, for solid fills that need to work
  acceptably in either scheme (buttons, badges) without a `prefers-color-scheme`
  split.

`oklch(L C H)` — lightness 0–1, chroma roughly 0–0.4 (capped by what's in-gamut
for that hue), hue in degrees. OKLCH hue degrees are **not** the same numbers as
HSL hue for the same visual color — if you're translating a palette from HSL,
don't reuse the hue number, re-pick it by eye or with a converter.

## Worked example

Say a project needs a new material for a "focus" or "spotlight" state — nothing
on the existing shelf fits. Pick a hue that's visually distinct from every
existing material (say, a violet, hue ≈300):

```css
--spotlight-darken: oklch(0.35 0.15 300); /* light mode */
--spotlight-lighten: oklch(0.63 0.15 300); /* dark mode */
--spotlight-fill: oklch(0.5 0.15 300); /* solid fills, either scheme */
```

Then wire it to a role, with the light/dark split living in the role map, not at
call sites:

```css
:root {
  --spotlight: var(--spotlight-darken);
}
@media (prefers-color-scheme: dark) {
  :root {
    --spotlight: var(--spotlight-lighten);
  }
}
```

Every component that needs this state references `var(--spotlight)` — never
`var(--spotlight-darken)` directly, unless it's deliberately scheme-locked
content (e.g. print/export output that should look the same regardless of the
viewer's OS setting).

## Growth rules, in order

1. **New need, existing job** → use an existing role. Don't mint `--focus-color`
   if `--emphasis` already means "draw attention here."
2. **Genuinely new job, existing hue fits** → mint a new role pointing at a
   material already on the shelf.
3. **Nothing fits** → add a material by the recipe above, then point a role at
   it.

Resist step 3 until steps 1 and 2 are truly exhausted — a palette that grows a
new material for every feature stops being a system and starts being a junk
drawer of one-off hues.
