---
name: realness-design
description: Design system for building web applications — typography, layout, and user experience. CSS selectors come from semantic HTML elements and microdata attributes (no class names). Provides a fluid modular type scale, base-line grid spacing, design system standard colors, and OS-native dark mode. Use when writing or reviewing CSS, implementing the type scale or spacing system, structuring a stylesheet, or choosing HTML element selectors. Pairs with the html, typography, and user-interface skills.
metadata:
  category: Design & Frontend
  tags:
    - css
    - design-system
    - typography
    - color
    - layout
---

# Realness Design

Semantic HTML first. Style the platform. Not components — elements.

**No CSS class names. Ever. Semantic HTML is your selector.**

We write selectors against semantic HTML elements and their attributes — `<time>`, `[itemprop]`, `[itemscope]`, `:has()`, `[aria-*]`. Not `.card`, `.author-block`, `.date-display`, or any other invented name. The element you pick **is** the selector you style, and the schema attribute **is** the structural hook.

The entire system rests on one conviction: **reach for the right semantic element before you reach for any selector.** `<address>` for contact info, `<time>` for dates, `<figure>` for media, `<nav>` for navigation — the browser ships a rich vocabulary. Use it.

Semantic HTML + microdata attributes are more than enough hand-hold to write elegant, maintainable CSS. If you reach for a class name, you're reaching for the wrong element or missing an existing attribute.

## The Virtuous Cycle

Semantic element, CSS selector, and microdata attribute all converge on the same thing. No class names. No utility classes. No `.author-block` or `.date-display`. The element IS the selector IS the schema.

```css
address[itemscope] {
  font-style: normal;
}
time {
  font-weight: 300;
  display: block;
}
```

The element you pick is the selector you style — for the markup side (`itemscope`, `itemprop`, `datetime`), see the **html** skill. Each layer reinforces the others: correct semantics reduce CSS selectors needed; microdata attributes provide structural hooks without extra classes; element-based CSS rewards using the right element. When you style `time` properly, you use `<time>` properly.

## Architecture

Our Stylus design system is organized by HTML element. Files are named after elements (`a`, `article`, `main`, `nav`, `section`), not components or features. One file per element. The browser's element model **is** the architecture — no component files, no feature folders. Components sit on top of this, importing element styles and adding page-specific customizations where needed.

## Spacing: base-line

Everything derives from one unit:

```css
--base-line: 1.333rem;
```

Margins, gaps, padding — all multiples of `base-line`. Not arbitrary pixels, not `rem` guesses. When something feels off, check whether it's a multiple.

## Type: fluid modular scale

Font sizes scale continuously between two breakpoints — no jumps. The scale is mathematically derived (min ratio 1.25, max ratio 1.414):

```
h1: 1.602rem → 2.441rem
h2: 1.424rem → 1.953rem
h3: 1.266rem → 1.563rem
body: 1.125rem → 1.333rem
```

Implementation uses the `between` mixin (slope-intercept form):

```css
font-size: calc(
  min + (max - min) * (100dvw - pad-begins) / (display-begins - pad-begins)
);
```

Headings: `font-weight: 300`, `letter-spacing: -0.02em`, `line-height: 1`. Light and tight.

Font: Lato (Light 300, Regular 400, Heavy 800), self-hosted as woff2 subsets with `font-display: swap`.

Prose width: `max-width: page-width` (≈ 65ch) — lines never run past ~75ch.

## Color: two accents, semantic neutrals

Blue and red are the accent pair. They're CSS custom properties so they shift between light and dark mode:

```css
/* light */
--blue: hsl(180, 35%, 32%);
--red: hsl(0, 35%, 38%);

/* dark */
--blue: hsl(180, 40%, 62%);
--red: hsl(0, 40%, 62%);
```

Neutral palette uses earth names: `sediment`, `sand`, `gravel`, `rocks`, `boulders`. Surface tokens: `--text`, `--surface`, `--code-surface`.

Brand gradient (headings, key links):

```css
background: linear-gradient(60deg, var(--blue), var(--red));
background-clip: text;
-webkit-background-clip: text;
color: transparent;
```

## Dark mode

`prefers-color-scheme` only. No JS, no class toggling. The OS preference is authoritative.

```css
:root {
  --blue: hsl(180, 35%, 32%);
}
@media (prefers-color-scheme: dark) {
  :root {
    --blue: hsl(180, 40%, 62%);
  }
}
```

## Links

```css
a {
  color: var(--blue);
  text-decoration: none;
}
p > a {
  border-bottom: 0.08vmin solid var(--blue);
  transition: all 0.8s ease-in-out 0.1s;
}
p > a:hover {
  color: var(--red);
}
```

Links inside prose get a subtle bottom border and a blue→red hover transition. Bare `a` elements (nav, UI) get no underline.

## HTML attributes as application state

The more expressive your semantic HTML, the less JavaScript you need. Native HTML attributes carry state that CSS can read directly — no JS toggle, no class manipulation.

```css
/* [open] is set by the browser — CSS responds, no JS */
details[open] > *:not(summary) {
  animation-name: slideInLeft;
}

/* :has() reads DOM state — scroll lock with zero JS */
body:has(dialog[open]) {
  overflow: hidden;
}
```

Prefer native boolean attributes (`open`, `disabled`, `checked`, `hidden`) over JS-managed classes. Prefer `<details>`/`<summary>` for disclosure, `<dialog>` for modals, `<input type="checkbox">` for toggles — each carries state the browser and CSS already understand.

## HTML as the data model (work/realness)

This section is the `work/realness` implementation, not a portable rule. The principle — HTML semantics can carry meaning all the way into the data layer, not just the display layer — is reusable; the specifics below are how realness does it.

`itemid` is a URL path that serves as storage key, fetch URL, CSS selector, and schema identifier simultaneously. One identifier across every layer.

`itemprop_value()` in `item.js` reads element semantics to extract values — `<time datetime>`, `<img src>`, `<a href>`, `<meta content>` — the element type tells you how to read the data.

When writing HTML: choose the element whose native semantics match the data. The browser, CSS, and any data layer all benefit from the same choice.

## Custom reset

We don't use off-the-shelf resets or normalize. We write a custom reset tailored to the project's element set — stripping margins on the elements we actually use, setting box-sizing, and normalizing form typography. Same philosophy: style what exists, don't patch what isn't there.

## Integration

- **html**: choose the right element first — semantics drive the CSS selectors
- **user-interface**: clarity, affordance, and interaction decisions
- **typography**: same method (rhythm, fluid scale), different values — use it to re-pick the baseline number, ratio, and font for a client's voice. The values in this skill are realness's own settings, not a mandate for every project
- **motion-systems**: all animation decisions — defer entirely
