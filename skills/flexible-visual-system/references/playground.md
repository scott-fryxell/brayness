# Playground Workflow

The playground exists to see the _family_, not a single output. Build a contact
sheet, judge it, tune the rules, repeat.

## Contact sheet

Render many seeds in a grid so coherence and variety are both visible at once.

```js
function contact_sheet({ seeds, generate, params, cols = 4 }) {
  const tiles = seeds
    .map((seed) => {
      const art = generate({ ...params, seed });
      return `<div class="tile">
      <div class="art">${art}</div>
      <div class="seed">seed ${seed}</div>
    </div>`;
    })
    .join("");
  return `<!doctype html><meta charset="utf-8">
  <style>
    body { margin: 0; background: #111; font: 12px monospace; color: #888 }
    .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 16px; padding: 16px }
    .art svg { width: 100%; display: block; background: #fff }
    .seed { padding: 4px 0 }
  </style>
  <div class="grid">${tiles}</div>`;
}

// usage
const seeds = Array.from({ length: 16 }, (_, i) => i + 1);
const html = contact_sheet({ seeds, generate, params: { palette } });
await writeFile("out/sheet.html", html);
```

Open `out/sheet.html` in a browser (or via the agent-browser skill) to read the
family.

## The tuning loop

1. **Render 12-16 seeds.** Always look at a batch first.
2. **Read two axes:**
   - _Coherence_: do they feel like one family? If not, you have too many free
     rules.
   - _Variety_: are they distinct enough to be worth a system? If not, add one
     knob.
3. **Adjust a rule, not an output.** Change a range, a probability, a
   quantization set. Never hand-edit a single SVG.
4. **Re-render the same seeds.** Comparing the same seeds across rule changes
   isolates the effect of the change.
5. **Stop when the sheet reads as one coherent, varied family.**

## Diagnosing a sheet

| Symptom                  | Cause                                                    | Fix                                                             |
| ------------------------ | -------------------------------------------------------- | --------------------------------------------------------------- |
| All tiles look identical | Randomness range too small / no seeded rule fires        | Widen jitter, lower probability gate threshold, add a transform |
| Tiles look unrelated     | Too many independent free rules                          | Remove a knob; key a transform to position instead of seed      |
| Muddy / busy             | Too many colors or overlapping high-amplitude transforms | Cut palette to 2-3; limit one dominant transform                |
| Boring but coherent      | One rule, no surprise                                    | Add a low-probability accent rule (p=0.1-0.2)                   |

## Sweeping a single knob

To understand one parameter, hold the seed fixed and sweep the knob:

```js
const accent_rates = [0, 0.1, 0.2, 0.35, 0.5, 0.75];
const tiles = accent_rates.map((p) =>
  generate({ palette, seed: 7, accent_p: p }),
);
```

Same seed, varying `accent_p`, shows exactly what that knob does. Do this for
each knob you are unsure about.

## From playground to assets

When the sheet has keepers:

1. Record the **exact params + seeds** of the winners (e.g.
   `seed 12, accent_p 0.2, cols 10`).
2. Re-render each keeper at final size.
3. Export as standalone SVG with the seed in the filename.
4. If the project needs tokens, lift the palette and grid constants into the
   project's design tokens so future assets stay on-system.

The keepers are not the deliverable; the _rules that produced them_ are. Save
both.
