---
name: typography
description: Typography advisor for client projects — font selection, type scale, fluid sizing, baseline rhythm, and performance. Draws on the realness design system as a proven reference while adapting to each client's voice and context. Use for font pairing, scale decisions, web font implementation, and typographic hierarchy. Not for logo design, icon fonts, or general CSS unrelated to type.
allowed-tools: Read,Write,Edit,WebFetch
metadata:
  category: Design & Creative
  pairs-with:
  - skill: realness-design
    reason: Settled type decisions for realness projects; proven patterns to draw from for client work
  - skill: html
    reason: Semantic elements carry typographic meaning
  - skill: user-interface
    reason: Readability and clarity decisions
  tags:
  - typography
  - fonts
  - type-scale
  - fluid-type
  - client-work
---

# Typography

Apply proven typographic thinking to each project's unique voice. The realness design system is the trusted elder — draw from its decisions as validated patterns, not as rules to copy.

## Starting a client project

Before picking a font or ratio, understand:

1. **Voice** — formal or approachable, dense or airy, editorial or functional?
2. **Content type** — long-form prose, UI labels, marketing, data?
3. **Performance constraints** — self-hosted or CDN, budget for font files?
4. **Existing brand** — is there a font already? What does it say?

Then build the system in this order: baseline unit → modular scale → fluid range → font choice. Don't start with the font.

## The baseline unit

Everything derives from one unit. Realness uses `1.333rem` — chosen because it's close to the browser default line-height and creates natural rhythm with the modular scale. For a client project, pick a value that feels right for their density:

- `1.25rem` — tighter, denser, more corporate
- `1.333rem` — realness default, balanced editorial
- `1.5rem` — looser, more generous, consumer-friendly

All margins, gaps, and padding are multiples of this unit. When spacing feels wrong, check whether it's a multiple.

## Modular scale

| Ratio | Name | Character |
|-------|------|-----------|
| 1.125 | Major Second | Quiet, functional, dense UI |
| 1.200 | Minor Third | Balanced, versatile, most web content |
| 1.250 | Major Third | Clear hierarchy, marketing |
| 1.333 | Perfect Fourth | Strong, editorial |
| 1.414 | Augmented Fourth | Dramatic, expressive |

Realness uses a **fluid range**: 1.25 at the smallest viewport → 1.414 at the largest. The scale itself scales. This gives quiet hierarchy on mobile and dramatic hierarchy on wide screens — without breakpoints.

For a client: pick a range that matches their voice. A law firm might stay fixed at 1.2. A creative studio might range 1.333 → 1.618.

## Fluid type

The proven approach is slope-intercept form — explicit about min size, max size, and the viewport range where scaling happens:

```css
/* min-size + (max-size - min-size) × (viewport - min-vw) / (max-vw - min-vw) */
font-size: calc(1.125rem + (1.333 - 1.125) * (100dvw - 26rem) / (60rem - 26rem));
```

CSS-only shorthand with `clamp()` (same result, less transparent):
```css
font-size: clamp(1.125rem, 0.875rem + 0.5dvw, 1.333rem);
```

Both are valid. The slope-intercept form is preferable when you want to reason about the exact breakpoints. `clamp()` is fine when you're eyeballing it.

## Heading treatment

Realness heading defaults are strong and worth using as a client starting point:

```css
h1, h2, h3, h4, h5, h6 {
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: var(--baseline);
}
h3, h4, h5, h6 { letter-spacing: -0.01em; }
```

Light weight + tight tracking + line-height of 1 works because the modular scale creates enough size contrast. If a client's brand is bolder, adjust weight before adjusting scale — going from 300 to 400 is usually enough.

## Font selection

**The right question:** what does this font do for the reader at the content's natural reading speed and distance?

```
Long-form prose, editorial          → Transitional Serif (Georgia, Charter, Lora)
Friendly, approachable, app-like    → Humanist Sans (Lato, Gill Sans, Source Sans)
Clean, technical, UI-heavy          → Geometric Sans (Inter, Futura, DM Sans)
Authoritative, formal, institutional → Classical Serif (Garamond, Minion, Crimson)
```

Realness uses Lato (Humanist Sans) — warm, readable at weight 300, distinct at weight 800. Good default for human-centered products. For a client with a different character, start from this same reasoning rather than copying the font.

**Pairing:** contrast beats matching. One serif + one sans from compatible eras works reliably. Superfamilies (same designer, serif + sans variants) are the safe path.

**Self-host always.** Google Fonts privacy implications aside, self-hosted woff2 subsets load faster and give you control. Latin subset is ~30KB vs ~150KB full character set.

```css
@font-face {
  font-family: 'ClientFont';
  src: url('/fonts/ClientFont-Light.woff2') format('woff2');
  font-weight: 300;
  font-display: swap;
}
```

## Performance

| Tier | Total font budget | Files |
|------|-------------------|-------|
| Fast (Core Web Vitals) | < 100KB | 2–3 woff2 |
| Balanced | 100–200KB | 4–5 woff2 |
| Rich | 200–400KB | 6–8 woff2 |

Preload the primary weight:
```html
<link rel="preload" as="font" type="font/woff2" href="/fonts/primary.woff2" crossorigin>
```

Match fallback x-height to prevent CLS on swap:
```css
@font-face {
  font-family: 'ClientFont';
  src: url('/fonts/ClientFont.woff2') format('woff2');
  size-adjust: 107%; /* match Arial x-height */
}
```

## Anti-patterns

**More than 2 families** — use weight and style variations instead. A 300/400/800 weight range on one family creates as much hierarchy as two families with less complexity.

**Fixed pixel sizes** — always rem, always fluid. User preferences and zoom levels must be respected.

**700 weight for headings** — harsh at large sizes. 300–500 range with tight tracking reads as more sophisticated.

**Full character sets** — subset to Latin unless the client explicitly needs Cyrillic, CJK, etc.

**`@import` for fonts** — blocks rendering. Use `<link>` in `<head>` or `@font-face` in CSS loaded directly.

## Accessibility

- Contrast: 4.5:1 body text, 3:1 large text (24px+ or 18.5px+ bold)
- Text must resize to 200% without losing content
- Line spacing: at least 1.5× font size
- Prose max-width: 65ch is the sweet spot — never let lines run past 75ch

## Same method, client-specific values

The method here — baseline rhythm, fluid modular scale, element-first type — is the same one **realness-design** documents, and it applies to every project, clients included. What changes per client is the *values*: the baseline number, the ratio, the font.

`realness-design` holds realness's own settled values (font, scale, baseline, headings, prose width, fluid implementation). Reuse them as a reference; don't copy them onto a client whose voice differs.

## Integration

- **realness-design**: the shared method (rhythm, fluid scale, element-first) plus realness's reference values — apply the method everywhere, adapt the values per client
- **html**: element choice is type choice — `<time>`, `<address>`, `<blockquote>`, `<h1>`–`<h6>` carry typographic meaning before CSS touches them
- **user-interface**: readability and clarity decisions when type and UX intersect
