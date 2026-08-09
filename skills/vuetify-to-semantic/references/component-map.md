# Component Map

Full mapping from Vuetify components to semantic HTML.

## Layout

| Vuetify | HTML | Notes |
|---|---|---|
| `v-app` | remove | `body` handles this |
| `v-main` | `<main>` | one per page |
| `v-container` | `<section>`, `<article>`, `<main>` | never a generic div if avoidable |
| `v-row` | remove | CSS Grid on parent |
| `v-col` | remove | CSS Grid on parent |
| `v-sheet` | `<section>` or `<aside>` | based on role |
| `v-divider` | `<hr>` | |
| `v-spacer` | remove | use `gap` on parent |

## App shell

| Vuetify | HTML | Notes |
|---|---|---|
| `v-app-bar` | `<header>` | `itemtype="https://schema.org/WPHeader"` |
| `v-app-bar-title` | `<h1>` or `<a>` | `itemprop="name"` |
| `v-app-bar-nav-icon` | `<button>` | `aria-expanded` + `aria-controls` |
| `v-toolbar` | `<header>` or `<nav>` | depends on context |
| `v-navigation-drawer` | `<nav>` | `itemtype="https://schema.org/SiteNavigationElement"` |

## Cards

`v-card` always becomes `<article>` with a Schema.org `itemtype` matching the entity it contains. See `microdata-entities.md`.

| Vuetify | HTML | Notes |
|---|---|---|
| `v-card` | `<article>` | + correct `itemscope itemtype` |
| `v-card-title` | `<h2>` / `<h3>` | `itemprop="name"` - use real heading level |
| `v-card-subtitle` | `<p>` | `itemprop="description"` |
| `v-card-text` | `<div>` | |
| `v-card-actions` | `<footer>` | inside the `<article>` |

## Lists

Use `<ul>` / `<li>` only when content is truly a list (membership matters). Use `<article>` per item when each item stands alone (cards, results, stories).

| Vuetify | HTML | Notes |
|---|---|---|
| `v-list` (nav) | `<ul>` inside `<nav>` | |
| `v-list` (content) | `<ul>` | `itemtype="https://schema.org/ItemList"` |
| `v-list-item` | `<li>` | `itemprop="itemListElement"` |
| `v-list-item-title` | `<span>` or heading | `itemprop="name"` |
| `v-list-item-subtitle` | `<p>` | `itemprop="description"` |

## Navigation

| Vuetify | HTML | Notes |
|---|---|---|
| `v-tabs` (page nav) | `<nav>` + `<a>` | |
| `v-tabs` (in-page) | `role="tablist"` pattern | ARIA tabs |
| `v-tab` (page nav) | `<a>` | |
| `v-tab` (in-page) | `<button role="tab">` | |
| `v-window` | `<div>` | |
| `v-window-item` | `<section role="tabpanel">` | |

## Buttons and actions

| Vuetify | HTML | Notes |
|---|---|---|
| `v-btn` with `to=` | `<a>` | router-link or plain anchor |
| `v-btn` without `to=` | `<button>` | |
| `v-btn-toggle` | `<div role="group">` | |
| `v-chip` | `<span>` | `data-status="value"` for CSS color targeting |
| `v-chip-group` | `<ul>` + `<li>` | |
| `v-badge` | nested `<span>` | or CSS `::after` |

## Icons

`v-icon` -> `<svg class="icon"><use href="/icons.svg#name" /></svg>`

Map `mdi-*` names to sprite IDs. Common mappings:
- `mdi-magnify` -> `search`
- `mdi-plus` -> `add`
- `mdi-chevron-left` -> `chevron-left`
- `mdi-chevron-right` -> `chevron-right`
- `mdi-arrow-up` -> `arrow-up`
- `mdi-arrow-down` -> `arrow-down`
- `mdi-account` -> `person`
- `mdi-domain` -> `organization`
- `mdi-pencil-clock` -> `edit-clock`
- `mdi-sort-variant` -> `sort`
- `mdi-close` -> `close`
- `mdi-delete` -> `delete`

## Media

| Vuetify | HTML | Notes |
|---|---|---|
| `v-img` | `<img>` | `loading="lazy"`, `itemprop="image"` |
| `v-avatar` | `<img>` | `itemprop="image"` on Person scope |
| `v-carousel` | `<ul>` + CSS scroll snap | |
| `v-carousel-item` | `<li>` | |

## Forms

| Vuetify | HTML | Notes |
|---|---|---|
| `v-form` | `<form>` | |
| `v-text-field` | `<label>` + `<input>` | explicit label always |
| `v-textarea` | `<label>` + `<textarea>` | |
| `v-select` | `<label>` + `<select>` | native |
| `v-autocomplete` | Headless UI Combobox | only case needing a library |
| `v-switch` | `<input type="checkbox">` | CSS toggle |
| `v-slider` | `<input type="range">` | |

## Overlays and feedback

| Vuetify | HTML | Notes |
|---|---|---|
| `v-dialog` | `<dialog>` | native |
| `v-menu` | `<ul popover>` | native Popover API |
| `v-tooltip` | CSS `::after` or `title` attr | |
| `v-overlay` | `<div>` | fixed + CSS |
| `v-snackbar` | `<div role="status">` | live region |
| `v-alert` | `<aside role="alert">` | |
| `v-progress-circular` | `<svg role="progressbar">` | CSS `conic-gradient` |
| `v-progress-linear` | `<progress>` | native |

## Data display

| Vuetify | HTML | Notes |
|---|---|---|
| `v-data-table` | `<table>` | custom sort/expand composable |
| `v-data-iterator` | `v-for` + CSS Grid | no wrapper |
| `v-expansion-panels` | `<details>` / `<summary>` | native |
| `v-expansion-panel-title` | `<summary>` | |
| `v-expansion-panel-text` | content inside `<details>` | |
| `v-timeline` | `<ol>` | `itemtype="https://schema.org/ItemList"` |
| `v-timeline-item` | `<li>` | |
| `v-stepper` | `<ol aria-label="steps">` | |
| `v-stepper-item` | `<li>` | `aria-current="step"` on active |

## Transitions

| Vuetify | CSS | Notes |
|---|---|---|
| `v-expand-transition` | `grid-template-rows: 0fr -> 1fr` | CSS grid height trick |

## Utility classes -> remove entirely

All Vuetify utility classes (`pa-*`, `ma-*`, `px-*`, `py-*`, `mx-*`, `my-*`, `d-flex`, `d-none`, `d-block`, `text-h*`, `text-body-*`, `text-caption`, `text-center`, `elevation-*`, `rounded`, `fill-height`, `align-center`, `justify-center`, `font-weight-*`, `ga-*`, `cursor-pointer`, etc.) are removed. Spacing, display, and typography are expressed in Stylus on the element selectors.
