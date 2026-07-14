# realness's current values

This is the deep-dive for "what does realness itself actually use" — the specific numbers and names SKILL.md points at without spelling out in full. None of this is the method; it's one project's current answer to it, and it will drift as the project does (the modular scale alone has been retuned three times — see `TYPE_SCALE_RECIPE.md`). If this file and the live source disagree, trust the source: `work/realness/src/style/`.

## File tree

```
src/style/
├── base-line.styl        the foundation file: reset + spacing unit + type scale
├── color.css              semantic roles, light/dark wiring
├── palette.css            material swatches (oklch)
├── font.css                @font-face
├── keyframes.css          shared @keyframes
├── aspect-ratio.css       poster aspect-ratio variants
├── mixins/                 Stylus mixins - the one thing native CSS can't do
│   ├── standards.styl     standard-border/-button/-grid, focus-ring
│   ├── fluid.styl          fluid-calc() - the clamp() slope math
│   ├── inset.styl          safe-area-inset helper
│   ├── frosted-glass.styl
│   ├── font-smoothing.styl
│   ├── disable-ios-touch-callout.styl
│   └── markdown-content.styl
└── elements/                one file per element
    ├── a.css, address.css, article.css, aside.css, blockquote.css,
    │   details.css, figure.css, hr.css, kbd.css, main.css, ol.css,
    │   p.css, section.css, time.css, ul.css        — plain CSS
    └── dialog.styl, form-controls.styl, nav.styl, svg.styl
                                                      — still Stylus:
        real mixin calls (standard-border, frosted-glass) and/or a
        breakpoint media query keyed on a derived width
```

Everything under `elements/` that has *neither* a mixin call nor a breakpoint has migrated to plain `.css`. The four Stylus holdouts are correctly Stylus, not unmigrated — see the Architecture section of SKILL.md for why those two conditions are the actual dividing line.

## Spacing and horizontal values

```css
--base-line: 1.333rem;
--page-width: 29rem;          /* prose measure, ≈65ch */
--page-width-large: 43rem;    /* breakpoint gate, not a cap */
--page-width-max: 64rem;      /* content limit, wide grid-heavy containers */
--support-page-width: 69rem;  /* content limit, docs/terms/settings pages */
```

## Type scale

Ratios 1.25 (min) / 1.414 (max), viewport thresholds 35rem (small) / 80rem (large):

```
h1: 2.441rem → 3.998rem
h2: 1.953rem → 2.827rem
h3: 1.563rem → 1.999rem
h4: 1.25rem → 1.414rem
h5: 1rem (constant)
h6: 0.8rem → 0.707rem  (clamp() bounds swapped — see TYPE_SCALE_RECIPE.md)
body: 1.125rem → 1.33rem  (own min-font/max-font pair, not derived from ratios)
```

Headings: `font-weight: 300`, `letter-spacing: -0.02em`, `line-height: 1`. Font: Lato (Light 300 / Regular 400 / Heavy 800), self-hosted woff2, `font-display: swap`.

## Palette

Materials — light/fill/dark triads in `oklch(L C H)`:

```css
--water-lighten: oklch(0.74 0.07 196);   --water-fill: oklch(0.62 0.07 196);   --water-darken: oklch(0.5 0.06 195);
--clay-lighten: oklch(0.74 0.12 20);     --clay-fill: oklch(0.51 0.13 21);     --clay-darken: oklch(0.46 0.13 21);
--slate-lighten: oklch(0.69 0.06 257);   --slate-fill: oklch(0.55 0.08 257);   --slate-darken: oklch(0.47 0.08 257);
--ochre-lighten: oklch(0.82 0.08 78 / 0.75); --ochre: oklch(0.78 0.1 72 / 0.75); --ochre-darken: oklch(0.48 0.09 69 / 0.75);
```

Neutrals (earth names, also load-bearing as poster layer names in the data model): `sediment`, `sand`, `gravel`, `rocks`, `boulders`, each with `-lighten`/`-darken` weights. Surfaces: `chalk` (light background), `bone` (light poster), `basalt` (dark background), `graphite` (light text), `pumice`, `moonlight`.

Roles, wired in `color.css` with a `prefers-color-scheme` split:

```css
--accent: var(--water-darken);    /* dark mode: --water-lighten */
--emphasis: var(--clay-darken);   /* dark mode: --clay-lighten */
--working: var(--slate-darken);   /* dark mode: --slate-lighten */
--warning: var(--ochre-darken);   /* dark mode: --ochre-lighten */
--text: var(--graphite);          /* dark mode: --bone */
--surface: var(--chalk);          /* dark mode: --basalt */
```

`--surface-glass`, `--code-surface`, `--muted-text` are derived from other surface custom properties (the latter two via `color-mix()`), not independent role picks.
