# Intake: deriving rules from a project

The playground assumes you have rules. Intake is how you get them - from the
project, not from thin air. Run it before any sweep.

Flow: **scan -> map -> bootstrap -> lock**.

## 1. Scan

Read the project's existing visual language before inventing one. Look for, in
rough priority order:

| Look at                          | Where                                               | Tells you                           |
| -------------------------------- | --------------------------------------------------- | ----------------------------------- |
| Design tokens / CSS custom props | `*:root`, `tokens.json`, `theme.*`, tailwind config | palette, spacing, type scale        |
| Palette                          | `tokens`, `tailwind.config`, `*.css` `--color-*`    | Color primitive (palette)           |
| Type scale                       | `--font-*`, `--step-*`, `modular-scale`             | Grid cell rhythm, baseline          |
| Logo / wordmark                  | `**/logo*.svg`, `**/brand*.svg`, favicon            | Module shape, symmetry, stroke      |
| Icon set                         | `**/icons/`, `**/icon-*.svg`                        | Module shape, stroke weight, corner |
| Base grid / layout               | `--max-width`, `--gutter`, container widths         | Grid primitive (cell size, cols)    |
| Motion / spacing tokens          | `--space-*`, `--duration-*`                         | Jitter ranges, transform steps      |

Commands to kick the tires:

```
rg -l --type css ':root' .
rg -l 'tailwind' .
fd -e svg 'logo|brand|icon' .
rg --type css '^\s*--'
```

Goal of scan: a short findings list, not an exhaustive audit. A handful of
concrete anchors (a palette, a stroke weight, a grid width, a motif) is enough
to start.

## 2. Map

Translate findings onto the six primitives. One finding often feeds several
primitives.

| Finding                           | Maps to primitive(s)                                |
| --------------------------------- | --------------------------------------------------- |
| Palette (2-5 swatches)            | Color palette + background                          |
| Logo curve / icon shape           | Module shape                                        |
| Stroke weight on icons            | Module weight                                       |
| Logo symmetry (90deg, mirror)     | Transformation quantization set (e.g. 0/90/180/270) |
| Type scale ratio                  | Grid cell ratio / gutter                            |
| Container max-width / columns     | Grid cols, cell size                                |
| Spacing scale                     | Jitter range bounds                                 |
| Brand "feel" (structured/organic) | Whether transforms key to position or to seed       |

Write the mapping as a short table so the leap from "what the project has" to
"which knobs to set" is auditable, not magic.

## 3. Bootstrap (no existing language)

If scan finds nothing usable, do not skip straight to picking a module.
Interview first, then propose one starter rule set from the answers.

Ask, in order, stopping as soon as you have enough:

1. **Mood** - 2-3 adjectives, or one reference brand/site.
2. **Anchor colors** - 2-3 hexes, or "dark bg / light fg / one accent".
3. **One motif** - a shape from the logo, a recurring icon, or "none, you
   pick". This is the seed of the Module primitive.
4. **Structure** - grid-aligned and geometric, or organic and loose? This sets
   whether transforms key to position or to seed.
5. **Do / don't** - one thing outputs must always do, one thing they must
   never do. These become hard rules.
6. **One reference** - image, link, or brand that captures the feel. Optional
   but sharpens everything above.

From the answers, propose **one** minimal rule set: a module, a grid, 1-2
transforms, a 2-3 color palette. Not three options to pick from - one, derived
from what they said. State each rule with its `why` so the user can edit
intent, not just output.

## 4. Lock

Write the chosen rules to the project's rules file so future runs read it first
instead of re-deriving. See `references/project-rules.md` for format and
location.

After lock, the playground sweeps seeds **on top of the locked rules**. When
tuning produces a changed rule, update the file - the rules are the source of
truth, not the last sweep's params.
