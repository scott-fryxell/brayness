---
name: realness-design
description: Design system method for web CSS, HTML, and Vue - semantic element/ARIA/microdata selectors (no invented classes or wrappers), baseline-grid spacing, fluid type scale, materials-and-roles color, OS dark mode, cascade over scoped styles. Use when writing or reviewing CSS/markup/Vue components, cleaning up div soup, or implementing type/spacing/color systems. Defer animation to motion-systems; client type voice to typography.
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

Semantic HTML first. Style the platform. Not components - elements.

This skill is a method, demonstrated through one project's answer to it. That project is realness (`work/realness`): a rotoscoping tool that traces photos into layered SVG posters. Sections pair a general rule with a "realness's instance" callout. When you bring this to a different project, keep the method and re-derive the specifics - a client's unit, ratio, and palette are not this project's.

## Semantic selectors, not invented ones

**Method**: write every CSS selector against something real - an element, native state, microdata, or ARIA. Never invent a name (a class, or a `data-*` that exists only to be a selector) for something that already has an honest attribute. `<address>` for contact info, `<time>` for dates, `<figure>` for media - the browser ships a rich vocabulary; reach for it before reaching for a selector.

- **Real** = something a human, crawler, or the data layer (`get_item`, Schema) should already recognize.
- **Anonymous** = a node with no meaning outside one widget's internals (spinner spoke, measurement ghost).

Walk this list and stop at the first honest fit:

1. Wrong element? Fix the tag.
2. Native state exists? Use it - `[open]`, `:checked`, `:invalid`, `[hidden]`, `[disabled]`, `:has(dialog[open])`.
3. Meaning for data already needs microdata? Style that - `[itemprop]`, `[itemscope]`, `[itemid]`, `[itemtype]`.
4. Meaning for a11y already needs ARIA? Style that - `[aria-*]`, `[role]`.
5. Global mode, not an element? One attribute on a high node (`html[data-aspect-ratio='16/9']`) - not a class or a `data-*` tree on every region.
6. Still anonymous chrome? A class is allowed - see below.

Microdata and ARIA aren't accessibility/SEO add-ons bolted on afterward - they're load-bearing CSS selectors here, so adding them is never wasted work. If you reach for a class or a new `data-*` for a **region or product thing** (page shell, poster, days feed, delete button), you're reaching for the wrong element or missing an existing attribute - prefer `id` + landmark, parent/child structure, `figure:has(svg[itemtype='/posters'])`, `[itemid]`, or an accessible name instead.

**A `data-*` attribute is a class with different punctuation** unless it earns its keep:

| Earns its keep                                                           | Does not                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Real app/document state CSS must read (`html[data-aspect-ratio='16/9']`) | Renaming a section so you can style it (`data-page` ~ `.page`)                  |
| Bridging JS <-> CSS for boolean state with no native home                  | Product nouns invented for CSS (`data-poster`, `data-days`)                     |
|                                                                          | Widget catalogs that should be element + accessible name (`data-icon='camera'`) |

**A class is allowed only when all of these hold:**

- The node isn't a meaningful element (spinner chrome, measurement ghost, layout scrap with no schema).
- No native / ARIA / microdata attribute honestly fits.
- The name is local to one component's `<style>` block, not shared app vocabulary.
- You'd be ashamed to put that same string on `data-*` for the whole app.

If allowed: BEM-flavored (`block__part`, `is-state`), scoped to that one component - never a bare reusable name like `.card`.

This is the whole system: element, selector, and microdata attribute converge on the same thing.

```css
address[itemscope] {
  font-style: normal;
}
time {
  font-weight: 300;
  display: block;
}
```

Correct semantics reduce the selectors you need; microdata gives you structural hooks without extra classes; element-based CSS rewards using the right element. When you style `time` properly, you use `<time>` properly. For the markup side - element choice, headings, forms, lists vs article - see [references/markup.md](references/markup.md).

realness's instance - the two live carve-outs (exceptions, not patterns to extend): `preference.vue`'s `.compact` and `working-border.vue`'s `.working-border`. Before adding a third, run the decision order above first. Known drift to remove when touching files: [references/realness-instance.md](references/realness-instance.md).

## No invented wrappers

**Method**: a node that exists only so CSS (or JS) can target "this group" is usually the wrong shape. Prefer no wrapper, a real element, or the attribute you already need for meaning - not `<div data-thing>` / `<div class="thing">`.

When you reach for a wrapper, ask what job it does and stop at the first honest fit:

1. **Only one meaningful child?** Delete the wrapper. Style/select the child (`textarea#wat`, `figure:has([itemtype='/posters'])`).
2. **Two siblings that must stay adjacent for CSS** (`nav + section`)? Vue multi-root - no shell. realness: `support-layout.vue` is just `<site-nav />` + `<router-view />`.
3. **Grouping form controls?** Use `<fieldset>` (or `<form>` when submit is the action). Style `fieldset:has(> #wat)`, not `data-posting-input`.
4. **ARIA / landmark role belonging to the region?** Put the role on the region you already have - `section[data-days][role='feed']` - not a child `<div role="feed">` whose only job is the role.
5. **Parent needs to reflect child meaning?** Prefer `:has()` on something real (`figure:has([itemtype='/posters'])`) over inventing `data-poster` on the parent. Keep JS `closest` / `querySelector` on the same hooks; leaving `closest('figure.poster')` after deleting `.poster` is a silent break.
6. **Still need a host with no honest element?** Only then: local class for anonymous chrome (see class carve-out above) - never a shared `data-*` product noun.

| Smell                                               | Prefer                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `<div data-support-layout>` around nav + view       | Multi-root fragment                                                                                          |
| `<div data-posting-input>` around textarea + button | `<fieldset>` / `<form>`                                                                                      |
| `<div role="feed">` around day articles             | `role="feed"` on the existing section                                                                        |
| `figure[data-poster]` / `.poster`                   | `figure:has([itemtype='/posters'])` (processing figure may carry `itemtype` on itself when no child SVG yet) |
| `data-*` renamed from a former class                | Re-run the selector decision order - punctuation is not progress                                             |

If a wrapper stays, its **element** must earn the keep (fieldset, form, dialog, nav). An attribute hung on a meaningless `div` so the stylesheet can see it does not.

## Architecture

**Method**: organize by HTML element, not by component or feature. One file per element (`a`, `article`, `main`, `nav`, `section`). The browser's element model **is** the architecture. Components sit on top of this, importing element styles and adding page-specific customizations where needed.

Two things sit outside that rule, and belong there rather than being forced into an element file:

- **A foundation file** for whatever every element depends on - a spacing unit, a reset, the type scale. It isn't about one element; it's the substrate the whole system builds on, so it's the one file/module every other file can assume is already loaded.
- **Breakpoint-driven files**. CSS custom properties cannot be read inside `@media` conditions in any browser today - that's a platform limitation, not a tooling gap. Any element whose styling depends on a derived viewport threshold (not just a literal you're willing to hardcode) needs a preprocessing step to compute that threshold at build time. An element file with a real breakpoint stays in whatever preprocessor you're using; one with none can be plain CSS.

realness's instance: a Stylus design system under `src/style/`, one file per element under `elements/`. The foundation file is `base-line.styl`. Stylus's job is deliberately narrow - mixins and breakpoint math, nothing else; files needing neither are plain `.css`. Full file tree and drift notes: [references/realness-instance.md](references/realness-instance.md).

## Spacing: one unit, two axes

**Method**: pick one spacing unit. Derive every margin, gap, and padding from it as a multiple. Not arbitrary pixels, not `rem` guesses. When something feels off, check whether it's a multiple.

The unit governs two axes differently, because they mean different things physically:

**Vertical harmony is non-negotiable: vertical measurements are whole multiples.** Margin-top, margin-bottom, padding-top, padding-bottom, line-height - anything that decides where the _next_ line lands - must be `unit x 1`, `x 2`, `x 4`, never `x 0.35` or `x 0.5`. A fractional vertical multiple isn't a smaller version of the same rhythm - it's off the grid entirely, and it shifts every block beneath it out of phase with the page's baseline. That drift compounds down the page and breaks alignment between columns that don't happen to share the same fractional offset. Worked example of what this catches: [references/examples/vertical-rhythm-cleanup.md](references/examples/vertical-rhythm-cleanup.md).

**Horizontal harmony is looser on small values, stricter on named ones.** Gap in a row and padding-left/right aren't part of the baseline grid - they don't move where a line of text sits vertically - so they can use whatever fraction of the unit looks right (`x 0.35`, `x 0.5`) without breaking anything. But the _big_ horizontal decisions - a prose measure, a breakpoint gate, a content-width ceiling - recur across a codebase, and an untracked project ends up with three different components each inventing their own "wide container" number. Keep those as a small closed set of named custom properties derived from the unit (a measure, a gate, a limit), and reach for an existing one before minting a new magic number. If nothing fits, name the new one - don't inline a fresh multiple and let it drift. A gate and a limit look interchangeable and aren't: [references/examples/gate-vs-limit.md](references/examples/gate-vs-limit.md).

When something feels off, check three things: is it a multiple of the unit; if it's vertical, is it a _whole_ one; and if it's a big horizontal number, does a name for it already exist?

A copy-paste starter implementing the reset, the unit, and these categories: [references/BASELINE_STARTER.css](references/BASELINE_STARTER.css). realness's own current values: [references/realness-instance.md](references/realness-instance.md).

## Type: fluid modular scale

**Method**: pick two ratios (a minimum and a maximum) and two viewport thresholds (where fluid scaling starts and stops). Every font size is `smallest-size x ratio^step`, computed once for its min and max bound. Render it with native `clamp()`, fed by a slope-intercept `calc()` between the two thresholds - no jumps, no media queries:

```css
font-size: clamp(
  min,
  calc(
    min + (max - min) * (100dvw - small-viewport) /
      (large-viewport - small-viewport)
  ),
  max
);
```

Because both bounds are plain CSS values, `clamp()` needs no build step to _render_ - only to _compute_ the slope constants, which is arithmetic a preprocessor (or a one-time script) does once, not something the browser needs to re-derive per frame. That's the whole reason this replaced the older three-media-query technique: same math, the browser does the interpolation instead of three discrete jumps.

One step needs a specific warning: whichever heading falls _below_ your body size (dividing by the ratio instead of multiplying) gets its min/max bounds in reverse numeric order, and handing `clamp()` bounds out of order silently collapses it to a constant rather than erroring. Full formula, the ratio math, and this gotcha worked through in detail: [references/TYPE_SCALE_RECIPE.md](references/TYPE_SCALE_RECIPE.md).

realness's instance: ratios 1.25/1.414, thresholds 35rem/80rem, Lato at three weights, 65ch prose measure. Those are settings, not the method - re-pick per project. Current values: [references/realness-instance.md](references/realness-instance.md).

## Color: materials and roles

**Method**: name swatches after materials, not hues - a material name survives a tuning pass, a hue name lies the moment the value drifts. Components only ever reference **roles** (semantic purpose: accent, emphasis, warning), never materials directly; a role points at a material. Each material carries a light value, a dark value lifted in lightness for dark mode, and a mid fill for solids. A rebrand or a dark-mode retune is a change to the role map or the material shelf, not a hundred call sites.

Growth rules, in order: new need -> use an existing role; genuinely new job -> mint a role pointing at a shelf material; nothing fits -> add a material (light ~35%/32-40% saturation/lightness, dark lifted to 60-66%, mid fill), then point the role at it. Full recipe with a worked example of adding a material from scratch: [references/COLOR_RECIPE.md](references/COLOR_RECIPE.md).

realness's instance - materials named for earth/water character (not this project's method, just its palette), `oklch(L C H)` values (OKLCH hue degrees aren't the same numbers as HSL hue for the same color - don't cross-reference this palette against an HSL one). `--accent` points at `water`, `--emphasis` at `clay`, `--working` at `slate`, `--warning` at `ochre`; neutrals use earth names (`sediment`, `sand`, `gravel`, `rocks`, `boulders`) load-bearing as poster layer names in the data model. Full palette and role wiring: [references/realness-instance.md](references/realness-instance.md).

Brand gradient (headings, key links) - also realness's instance, not the method:

```css
background: linear-gradient(60deg, var(--accent), var(--emphasis));
background-clip: text;
-webkit-background-clip: text;
color: transparent;
```

## Dark mode

**Method**: `prefers-color-scheme` only. No JS, no class toggling. The OS preference is authoritative - a role's light and dark values live in the same custom-property declaration, one media query away from each other.

```css
:root {
  --accent: oklch(0.5 0.06 195);
}
@media (prefers-color-scheme: dark) {
  :root {
    --accent: oklch(0.77 0.07 196);
  }
}
```

## Links

**Method**: prose links get a visible affordance beyond color (people scan body text for the next thing to click); bare UI links (nav, chrome) don't need one - their context already signals interactivity.

realness's instance:

```css
a {
  color: var(--accent);
  text-decoration: none;
}
p > a {
  border-bottom: 0.08vmin solid var(--accent);
  transition: all 0.8s ease-in-out 0.1s;
}
p > a:hover {
  color: var(--emphasis);
}
```

Links inside prose get a subtle bottom border and an accent -> emphasis hover transition. Bare `a` elements get no underline.

## HTML attributes as application state

The more expressive your semantic HTML, the less JavaScript you need. Native HTML attributes carry state that CSS can read directly - no JS toggle, no class manipulation.

```css
/* [open] is set by the browser - CSS responds, no JS */
details[open] > *:not(summary) {
  animation-name: slideInLeft;
}

/* :has() reads DOM state - scroll lock with zero JS */
body:has(dialog[open]) {
  overflow: hidden;
}
```

Prefer native boolean attributes (`open`, `disabled`, `checked`, `hidden`) over JS-managed classes or invented `data-*` style hooks. Prefer `<details>`/`<summary>` for disclosure, `<dialog>` for modals, `<input type="checkbox">` for toggles - each carries state the browser and CSS already understand. If a reflected attribute is required for non-native app/document state, keep it rare and high on the tree (see [Semantic selectors, not invented ones](#semantic-selectors-not-invented-ones)).

## Markup over map()

**Method**: for a small, fixed set of items where each one's content differs in shape - not just in value - write each one out as its own HTML block rather than driving it from a `v-for`/`.map()` over a data array. It's more readable: a reader sees exactly what renders, instead of having to mentally execute a loop (and whatever per-item branching it needs) to find out.

This isn't a rule against `v-for` generally - a genuinely uniform, open-ended, or data-driven list (posters, thoughts, search results) still belongs in a loop; iterating one shape of markup over N items of the same shape is exactly what loops are for. It's specifically the small-and-non-uniform case: a handful of known items whose markup differs enough between them that a generic template would need to branch per-item anyway, at which point the loop isn't saving anything - it's just hiding the branching in JS instead of showing it in HTML.

realness's instance: `Colors.vue`'s role cards (`accent`, `working`, `emphasis`, `warning`) are separate `<li>` blocks, not `v-for="role in role_names"`, even though `role_names` exists right there in the script and a loop would be trivial to write. Each card's `<figure>` demonstrates its role with different real elements - accent gets a link and a button, working gets an output and an input, emphasis gets a checkbox label, a paragraph, and a remove button - because each role shows up in different real UI. A loop would either flatten that down to something generic and less honest, or branch per-role in the template anyway.

## HTML as the data model (work/realness)

This section is the `work/realness` implementation, not a portable rule. The principle - HTML semantics can carry meaning all the way into the data layer, not just the display layer - is reusable; the specifics below are how realness does it.

`itemid` is a URL path that serves as storage key, fetch URL, CSS selector, and schema identifier simultaneously. One identifier across every layer.

`itemprop_value()` in `item.js` reads element semantics to extract values - `<time datetime>`, `<img src>`, `<a href>`, `<meta content>` - the element type tells you how to read the data.

When writing HTML: choose the element whose native semantics match the data. The browser, CSS, and any data layer all benefit from the same choice.

## Custom reset

We don't use off-the-shelf resets or normalize. We write a custom reset tailored to the project's element set - stripping margins on the elements we actually use, setting box-sizing, and normalizing form typography. Same philosophy: style what exists, don't patch what isn't there.

This reset is also the precondition for vertical harmony to mean anything: whole-multiple margins only produce a clean baseline grid if every element starts from zero, not from a browser default that varies by element and user-agent.

## Cascade over scoping

**Method**: don't use Vue's `scoped` style attribute or Vue's `<Transition>`/`<TransitionGroup>` components. Both work against a system built on the global cascade and semantic-element selectors.

`scoped` rewrites your element selectors into attribute-hashed ones behind the scenes - it defeats "the element IS the selector" from the top of this skill, and it blocks the cross-component cascade rules the architecture depends on (a parent's `article > header` reaching into a child's markup, a page-level class gating a descendant's layout). Write plain, unscoped `<style>` blocks that select real elements and attributes; file load order plus normal specificity do the scoping work, the same way the element-per-file architecture already relies on cascade order rather than isolation.

`<Transition>`/`<TransitionGroup>` swap in Vue-managed enter/leave classes in place of CSS you'd otherwise write directly against an element's own attributes. Author animation as plain `animation`/`transition` properties keyed to native HTML state (`[open]`, `:active`, a boolean prop reflected as an attribute - see [HTML attributes as application state](#html-attributes-as-application-state)) instead, colocated in the element's own style block. realness's instance has exactly one holdout - `Pricing.vue` uses `<transition name="slide" mode="out-in">`, with its own style block explicitly commented `// Vue transition hooks (framework mechanic, not a styling selector)`. That comment is the tell: the author already flagged it as the exception, not a pattern to copy. Treat any new `<Transition>` usage the same way `motion-systems` treats animation decisions generally - a deliberate, justified departure, not a default.

**Spacing lives in the cascade, not the leaf.** A component's own outer `margin`/`padding` is often not its job - the parent context (a `section`'s padding, a flex `gap`, `standard-grid`) already establishes the rhythm around it, and a leaf component that also asserts its own outer spacing is likely to double up against that rhythm or fight it when the component gets reused in a different parent. Before adding `margin`/`padding` to a component's outermost element, check whether it can be assumed from further up the tree instead. This extends the "one unit, whole multiples" rule above: cascade-inherited spacing is the default; a component asserting its own outer spacing is the exception, reserved for whatever rhythm is genuinely internal to that component (padding between its own children), not the space around it.

## Vue SFC script style (work/realness)

realness-only conventions for the script half of a component (`<script setup>`, `on_` handler prefixes, SCREAMING_SNAKE constants, prop shapes, import casing): [references/realness-instance.md](references/realness-instance.md). Baseline JS style (snake_case, no semicolons, JSDoc) is already in AGENTS.md.

## Integration

- **user-interface**: clarity, affordance, and interaction decisions
- **typography**: same method (rhythm, fluid scale), different values - use it to re-pick the unit, ratios, and font for a client's voice
- **motion-systems**: all animation decisions - defer entirely

Every numbered value in this skill - the base unit, the type ratios, the breakpoint thresholds, the palette - is realness's own setting, not a mandate for every project. The method (one unit, whole vertical multiples, named horizontal values, materials-and-roles, `clamp()`-based scaling, `prefers-color-scheme` dark mode) is what's portable.

## Reference files

- [references/markup.md](references/markup.md) - the element side: element choice, headings, landmarks, forms, lists vs article vs section, links vs buttons, images, anti-patterns.
- [references/BASELINE_STARTER.css](references/BASELINE_STARTER.css) - copy-paste starter: reset, spacing unit, horizontal values, fluid type scale.
- [references/TYPE_SCALE_RECIPE.md](references/TYPE_SCALE_RECIPE.md) - the ratio math, the `clamp()` formula, and the below-body-size bound-order gotcha.
- [references/COLOR_RECIPE.md](references/COLOR_RECIPE.md) - materials-and-roles method plus a worked example of adding a material.
- [references/realness-instance.md](references/realness-instance.md) - realness's current file tree, custom properties, type scale, and palette in one place.
- [references/examples/vertical-rhythm-cleanup.md](references/examples/vertical-rhythm-cleanup.md) - a real fix: restated spacing that drifted from the system default.
- [references/examples/gate-vs-limit.md](references/examples/gate-vs-limit.md) - a real fix: a breakpoint gate reused as a content limit.
