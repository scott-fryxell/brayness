---
name: vuetify-to-semantic
description: Refactor a Vue page or component from Vuetify to semantic HTML5 + Schema.org microdata + Stylus element selectors. Use when converting a seeq-app view or component file, removing v-* components, replacing utility classes with Stylus, or adding Schema.org microdata to an entity page. Triggers include "refactor this page", "convert this component", "remove vuetify from", "make this semantic".
metadata:
  category: Frontend & Refactoring
  tags:
    - vuetify
    - semantic-html
    - microdata
    - schema.org
    - stylus
    - seeq
---

# Vuetify to Semantic

Refactor a seeq-app Vue page or component from Vuetify to semantic HTML5, Schema.org microdata, and Stylus element selectors. Follows the `work/realness` pattern: no utility classes, no replacement component library, styles applied via element and attribute selectors only.

## Process

### 1. Read the target file

Read the full `.vue` file. Identify:
- Every `v-*` component used
- Every Vuetify utility class (`pa-*`, `ma-*`, `d-flex`, `text-h*`, `elevation-*`, etc.)
- Every `useTheme` / `useDisplay` import from `'vuetify'`
- What real-world entities the page represents (projects, stories, people, organizations)

### 2. Map components to semantic elements

Use `references/component-map.md` for the full mapping.

Key decisions:
- `v-row` / `v-col` -> remove both; apply CSS Grid to the parent element directly
- `v-card` -> `<article>` with the correct Schema.org `itemtype` for the entity
- `v-sheet` -> `<section>` or `<aside>` based on role
- `v-list` / `v-list-item` -> `<ul>` / `<li>` only when content is truly a list; use `<article>` per item when each stands alone
- `v-btn` with `to=` -> `<a>`; without `to=` -> `<button>`
- `v-icon` -> `<svg class="icon"><use href="/icons.svg#name" /></svg>`
- `v-dialog` -> `<dialog>`
- `v-navigation-drawer` -> `<nav>`
- `v-app-bar` -> `<header>`

### 3. Add Schema.org microdata

Use `references/microdata-entities.md` for Seeq entity types.

Rules:
- Add `itemscope itemtype="https://schema.org/X"` to the container element
- Add `itemprop` to child elements that carry data fields
- Use `<time datetime="...">` for dates
- Use `<data value="...">` for machine-readable values not in visible text
- Do not add microdata to layout-only elements

### 4. Rewrite the template

Output a clean `<template>` block:
- No `v-*` components
- No Vuetify utility classes on any element
- Semantic elements with correct hierarchy
- Schema.org attributes on entity containers and their fields
- `data-*` attributes for JS state hooks where needed
- ARIA only where native HTML cannot express the needed behavior
- Keep all Vue directives (`v-if`, `v-for`, `v-model`, `@click`, `:src`, etc.) intact

### 5. Replace Vuetify composables

- `useDisplay` -> `use_display` composable (create `src/use/display.js`, matching realness's `src/use/` layout) using `matchMedia`
- `useTheme` -> `use_theme` composable (create `src/use/theme.js`) reading `prefers-color-scheme`

Update the `<script setup>` import accordingly.

### 6. Write the Stylus

Follow `references/stylus-patterns.md`.

Rules:
- One `<style lang="stylus" scoped>` block per component for component-specific layout
- Shared element styles live in `src/style/elements/`
- Never use class selectors for styling - use element, attribute, and microdata selectors
- Use `base-line` as the spacing unit
- Use CSS custom properties for colors (`var(--color-primary)`, etc.)
- Use `standard-border`, `standard-button`, `standard-grid` mixins where applicable
- Dark mode via `@media (prefers-color-scheme: dark)` blocks, not JS

Selector patterns:
```stylus
// entity type
article[itemtype*="ResearchProject"]
  ...

// state via data attribute
button[data-status="active"]
  ...

// structural position
nav > ul > li > a
  ...

// ARIA state
button[aria-expanded="true"]
  ...
```

### 7. Review

Before outputting, verify:
- [ ] No `v-*` components remain
- [ ] No Vuetify utility classes remain
- [ ] No `class=` attributes used for styling (only for JS hooks if unavoidable)
- [ ] Every entity container has correct Schema.org `itemtype`
- [ ] Every data field has `itemprop`
- [ ] All interactive elements are correct (`button` vs `a`)
- [ ] Images have `alt`, `loading="lazy"`, and `itemprop="image"` where appropriate
- [ ] Forms have explicit `<label>` for every input
- [ ] CSS Grid replaces all grid row/column wrapper elements
- [ ] Stylus uses element/attribute selectors only

## Output format

Return three blocks in order:

1. `<template>` - the full refactored template
2. `<script setup>` - updated script (only if imports changed)
3. `<style lang="stylus" scoped>` - component-scoped Stylus for layout specific to this component

If shared element styles need to be added to `src/style/elements/`, note them separately after the component output.
