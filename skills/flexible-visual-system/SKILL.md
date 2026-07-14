---
name: flexible-visual-system
description:
  Derive a project's visual rules from its existing tokens, palette, type scale,
  logo, and icons (Intake), then generate raw SVG vector graphics from those
  rules as a small composable set (module, grid, repetition, transformation,
  color, controlled randomness), following Martin Lorenz's flexible visual
  systems approach. Use as a playground to explore and discover identity systems,
  patterns, posters, icon sets, and generative marks that stay coherent while
  producing infinite variation. Triggers include "build a visual system",
  "generate SVG patterns", "create a flexible identity", "make a generative
  graphic playground", "explore module-based design", "derive rules from this
  project", or producing design-system assets for a project from rules rather
  than hand-drawing.
---

# Flexible Visual System

Generate raw SVG from rules, not by hand-drawing. One small rule set produces a
coherent family of infinite variations.

Based on Martin Lorenz (new.twopoints.net/fvs), _Flexible Visual Systems_:
design the system, not the output. Fixed rules + variable inputs = consistent
identity that flexes.

Flow: **intake -> sweep -> tune -> lock -> export**. Intake derives rules from the project; the rest explores on top of them.

## Core idea

A visual system is `f(rules, seed) -> SVG`.

- The **rules** stay fixed (that is what makes the family coherent).
- The **seed / inputs** vary (that is what makes each output distinct).
- You explore by sweeping inputs in a playground, then lock the ones worth
  keeping as design-system assets.

Do not draw a logo. Build the machine that draws thousands of valid logos, then
pick.

## Intake: deriving rules from a project

The playground needs rules to sweep. Intake gets them from the project, not
from thin air. Run it before any sweep.

**Scan -> Map -> Bootstrap -> Lock.**

1. **Scan** - read the project's existing tokens, palette, type scale, logo,
   icons, base grid. A handful of anchors is enough; do not audit exhaustively.
2. **Map** - translate findings onto the six primitives (palette -> Color,
   logo symmetry -> Transformation quantization, container grid -> Grid cols,
   stroke weight -> Module weight, etc.).
3. **Bootstrap** - if scan finds nothing usable: a short guided interview
   (mood, 2 anchor colors, one motif, structure, do/don't, optional
   reference), then propose **one** minimal starter rule set with a `why` per
   rule. Not three to pick from - one, derived from what they said.
4. **Lock** - write the chosen rules to the project's rules file so future
   runs read it first instead of re-deriving.

Read `references/intake.md` for the scan checklist, the finding-to-primitive
map, the interview questions, and the bootstrap-to-lock handoff.

## The rules file (project source of truth)

The locked rules live in `visual-system.md` at the project root. The skill
reads it before every generate/sweep/export, and writes back when a rule
changes or a keeper is locked.

Format: markdown, one rule per bullet, each followed by a `why:` line. The
`why` is what lets you edit intent, not just values. Keepers record their seed

- params so any output is reproducible from the file.

Read `references/project-rules.md` for the format, the read/write contract,
and a full example file.

## The six primitives

Every system is assembled from these. Keep the set small.

| Primitive          | What it controls           | Example knobs                                          |
| ------------------ | -------------------------- | ------------------------------------------------------ |
| **Module**         | The base mark/cell         | shape, stroke weight, corner style, fill rule          |
| **Grid**           | Coordinate scaffold        | columns, rows, cell size, gutters, isometric/skew      |
| **Repetition**     | How modules multiply       | tile, array, ring, spiral, recursive subdivision       |
| **Transformation** | Per-instance change        | rotate, scale, mirror, shear, displace                 |
| **Color**          | Palette + assignment logic | palette set, per-cell rule, gradient, by-position      |
| **Randomness**     | Controlled variation       | seeded RNG, jitter range, probability of a rule firing |

Read `references/primitives.md` for the rule vocabulary and how primitives
compose.

## How we generate SVG (no library)

We build SVG ourselves as strings or DOM. No p5, no svg.js.

- Define a `viewBox` and treat it as the coordinate system (the grid lives
  here).
- Place modules by computing `x, y` from grid indices.
- Apply transforms with the `transform` attribute
  (`translate/rotate/scale/matrix`).
- Assign color by rule, keyed on cell index/position/seed.
- Use a **seeded** RNG so any output is reproducible from its seed.

Read `references/svg-generation.md` for the construction patterns (coordinate
math, transform composition, seeded RNG, export).

## Playground workflow

The goal is exploration first, assets second.

1. **Start from the locked rules** - read `visual-system.md`. If it is
   missing, run Intake first. The sweep varies seeds and params on top of the
   locked rules; it does not re-derive them.
2. **Generate a sweep** - render many seeds side by side as a contact sheet
   (grid of SVGs).
3. **Read the family** - judge coherence and variety. Too samey -> add a knob.
   Too chaotic -> remove one.
4. **Tune knobs** - adjust ranges, not individual outputs.
5. **Lock keepers** - record the exact rules + seeds that produced winners
   back into the rules file.
6. **Export assets** - emit those as standalone SVG files for the project.

Read `references/playground.md` for the contact-sheet pattern and the tuning
loop.

## Output contract

When generating a system, return:

1. **Read the rules file** - load `visual-system.md` first. If missing, run Intake.
2. **Rule set** - the chosen primitives and their knobs, stated explicitly.
3. **Generator** - the SVG-producing code (vanilla JS), seedable and
   reproducible, driven by the locked rules.
4. **Contact sheet** - a multi-seed sweep on top of the locked rules so the
   family is visible, not a single output.
5. **Keepers** - the seeds/params worth exporting, recorded back into the
   rules file with why.
6. **Export note** - how to pull a keeper out as a standalone SVG.

## Worked examples

See `references/examples.md` for:

- Happy path: a 3-rule module-on-grid system with a seed sweep
- Robust variant: same system made reproducible, accessible, and export-ready
- Anti-pattern + fix: hand-tuning individual outputs (breaks the system) vs
  tuning rules

## Principles

- **Tune rules, not outputs.** If you find yourself nudging a single shape, that
  belongs in a rule or it is noise.
- **Keep the rule set small.** Coherence comes from few rules applied
  consistently, not many exceptions.
- **Seed everything.** Every output must be reproducible from `(rules, seed)`.
- **Show the family, not the favorite.** Always render a sweep before judging.
- **Constraints make it flex.** A tight grid + one transform yields more usable
  variation than freeform drawing.

## Anti-patterns

- Hand-editing generated SVG node-by-node (you left the system)
- Unseeded `Math.random()` (outputs cannot be reproduced or exported reliably)
- Ten special-case rules to force one look (collapse them into fewer general
  rules)
- Judging the system from a single render
- Skipping Intake and picking a module from thin air (outputs won't tie to the project's existing visual language)
- Reaching for p5/svg.js when plain SVG strings do the job
