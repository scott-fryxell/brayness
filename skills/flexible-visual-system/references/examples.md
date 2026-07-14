# Worked Examples

Three examples: a minimal happy path, the same system made robust, and an
anti-pattern with its fix.

---

## 1. Happy path: half-disc poster system

A 3-rule system. Module = half-disc. Grid = 10x10. Transform = quantized random
rotation. Color = 2-tone with seeded accent.

```js
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate({ seed, size = 1000, cols = 10, palette }) {
  const rand = rng(seed);
  const cell = size / cols;
  const r = cell / 2;
  let inner = "";
  for (let row = 0; row < cols; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * cell + r;
      const cy = row * cell + r;
      const deg = [0, 90, 180, 270][Math.floor(rand() * 4)];
      const fill = rand() < 0.2 ? palette.accent : palette.fg;
      inner += `<g transform="translate(${cx} ${cy}) rotate(${deg})">
        <path d="M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z" fill="${fill}"/></g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${palette.bg}"/>${inner}</svg>`;
}

const palette = { bg: "#0e0e10", fg: "#f2f2f2", accent: "#ff4d2e" };
// sweep seeds 1..16 into a contact sheet, pick keepers
```

Why it works: tiny rule set, fully seeded, produces a coherent family with real
variety. Each seed is a distinct, reproducible poster.

---

## 2. Robust variant: reproducible, accessible, export-ready

Same system, hardened for design-system use.

```js
function generate({
  seed,
  size = 1000,
  cols = 10,
  palette,
  accent_p = 0.2,
  title,
}) {
  if (!Number.isInteger(seed))
    throw new Error("seed must be an integer for reproducibility");
  const rand = rng(seed);
  const cell = size / cols;
  const r = cell / 2;
  const rotations = [0, 90, 180, 270];
  let inner = "";
  for (let row = 0; row < cols; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * cell + r;
      const cy = row * cell + r;
      const deg = rotations[Math.floor(rand() * rotations.length)];
      const fill = rand() < accent_p ? palette.accent : palette.fg;
      inner += `<g transform="translate(${cx} ${cy}) rotate(${deg})">
        <path d="M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z" fill="${fill}"/></g>`;
    }
  }
  // title + role make the SVG accessible and self-documenting
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"
    role="img" aria-label="${title || `generative poster, seed ${seed}`}">
    <title>${title || `poster ${seed}`}</title>
    <desc>seed=${seed} cols=${cols} accent_p=${accent_p}</desc>
    <rect width="${size}" height="${size}" fill="${palette.bg}"/>${inner}</svg>`;
}
```

What hardened it:

- **Validates the seed** so output stays reproducible.
- **Exposes knobs as params** (`accent_p`, `cols`) instead of magic numbers, so
  the playground can sweep them.
- **Embeds provenance** in `<desc>` (seed + params) so any exported file traces
  back to its rules.
- **Accessible**: `role`, `aria-label`, `<title>` for screen readers and
  design-tool import.
- Palette comes from outside, so project tokens drive color.

---

## 3. Anti-pattern + fix: hand-tuning outputs

### Anti-pattern (broken)

You generate a poster, mostly like it, but nudge a few cells by hand:

```js
let markup = generate({ seed: 12, palette });
// "the disc at 3,4 should point the other way..."
markup = markup.replace(
  '<g transform="translate(350 450) rotate(90)">',
  '<g transform="translate(350 450) rotate(270)">',
);
// "...and make this one blue"
markup = markup.replace(
  /(translate\(650 250\)[^>]*>)\s*<path fill="#f2f2f2"/,
  '$1<path fill="#3a7bff"',
);
```

Why this is wrong:

- You left the system. The output no longer equals `f(rules, seed)`.
- It is not reproducible; the edits live nowhere a re-render would pick them up.
- It does not scale; every new size or variation needs the same manual surgery.
- The "fix" is invisible to the rule set, so the family drifts incoherent.

### Fix (back into the system)

Decide what the hand-edit was really telling you, then encode it as a rule.

"That disc should point the other way" was actually "I want more 270-rotations
near the edges". Make it a rule:

```js
const deg =
  col === 0 || col === cols - 1 || row === 0 || row === cols - 1
    ? 270 // edge rule: bias outward
    : rotations[Math.floor(rand() * rotations.length)];
```

"Make this one blue" was "I want an occasional cool accent". Make it a seeded
gate:

```js
const fill =
  rand() < 0.05
    ? palette.cool // rare cool accent rule
    : rand() < accent_p
      ? palette.accent
      : palette.fg;
```

Now the intent lives in the rules. Re-render any seed and the behavior persists,
scales, and stays on-system. Tune the rule, never the output.
