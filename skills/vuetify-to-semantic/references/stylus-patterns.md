# Stylus Patterns

Write Stylus using CSS syntax: braces, semicolons, standard property declarations. Mixins are available and preferred for shared patterns. No indented Stylus syntax.

## Syntax

```stylus
article[itemtype*="ResearchProject"] {
  standard-border(blue);
  display: flex;
  flex-direction: column;
  gap: base-line;
}
```

Not:
```stylus
// don't use indented syntax
article[itemtype*="ResearchProject"]
  display flex
  gap base-line
```

## Selector strategy

Style via element type, attribute, and structural position. Never use class selectors for visual styling.

```stylus
// entity type via microdata attribute
article[itemtype*="Article"] { ... }

// ARIA state
button[aria-expanded="true"] { ... }

// data attribute for JS-driven state
span[data-status="pending"] { ... }

// structural position
nav > ul > li > a { ... }

// media query inside selector
article[itemtype*="Person"] {
  @media (prefers-color-scheme: dark) {
    border-color: var(--blue);
  }
}
```

## Available mixins

Defined in `work/realness/src/style/mixins/`:

```stylus
// Border with radius
standard-border(blue);
standard-border(red);
standard-border();  // currentColor

// Button base styles
standard-button(blue);
standard-button();

// Responsive auto-fill grid
standard-grid();

// Drop shadow
standard-shadow();
```

## Design tokens

All spacing, color, and typography values come from CSS custom properties or Stylus variables:

```stylus
// Spacing - base-line is 1.333rem, use multiples
gap: base-line;
padding: calc(base-line * 0.5);
margin-top: calc(base-line * 2);

// Colors - CSS custom properties
color: var(--text);
background-color: var(--surface);
border-color: var(--color-primary);

// Or Stylus color variables for computed values
border-color: blue-fill;
color: lighten(blue-fill, 20%);
```

## Seeq color tokens

Map from Vuetify config to CSS custom properties (set in `src/style/variables.styl`):

```stylus
--color-primary: hsl(195, 47%, 56%);    // #51b4cd
--color-secondary: hsl(25, 66%, 57%);  // #de8244
--color-accent: hsl(44, 89%, 61%);     // #f5c242
--color-error: hsl(25, 36%, 46%);      // #b66836
--color-warning: hsl(41, 89%, 61%);    // #f5b342
```

## Replacing Vuetify utility classes

| Vuetify class | Stylus equivalent |
|---|---|
| `pa-4` | `padding: calc(base-line * 1);` |
| `pa-2` | `padding: calc(base-line * 0.5);` |
| `ma-2` | `margin: calc(base-line * 0.5);` |
| `mb-2` | `margin-bottom: calc(base-line * 0.5);` |
| `d-flex` | `display: flex;` |
| `d-none` | `display: none;` |
| `align-center` | `align-items: center;` |
| `justify-center` | `justify-content: center;` |
| `justify-space-between` | `justify-content: space-between;` |
| `flex-column` | `flex-direction: column;` |
| `ga-2` | `gap: calc(base-line * 0.5);` |
| `text-capitalize` | `text-transform: capitalize;` |
| `font-weight-bold` | `font-weight: bold;` |
| `text-center` | `text-align: center;` |
| `fill-height` | `height: 100%;` |
| `cursor-pointer` | `cursor: pointer;` |
| `elevation-N` | `standard-shadow();` |
| `rounded` / `rounded-lg` | `border-radius: calc(base-line * 0.33);` |

Spacing scale reference (Vuetify uses 4px = 1 unit; base-line = ~21px):
- `*-1` ~ `calc(base-line * 0.2)`
- `*-2` ~ `calc(base-line * 0.4)`
- `*-4` ~ `calc(base-line * 0.75)`
- `*-6` ~ `base-line`
- `*-8` ~ `calc(base-line * 1.5)`

## Grid replacing v-row / v-col

Replace `v-row` + `v-col` wrapper elements with CSS Grid on the parent. No wrapper elements.

```stylus
// replaces <v-container><v-row><v-col cols="12" sm="6">
section.projects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: base-line;
}

// replaces specific breakpoint columns
section.sponsors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(base-line * 0.5);
  @media (max-width: pad-begins) {
    grid-template-columns: 1fr;
  }
}
```

## Component scoped vs shared

- Component `<style lang="stylus" scoped>` - layout specific to this component instance
- `src/style/elements/article.styl` - styles for `<article>` across the whole app
- `src/style/elements/dialog.styl` - styles for `<dialog>` across the whole app

When adding styles for an element type that is used app-wide, add to the shared element file, not the component scope.

## Dark mode

Always via media query, never JS:

```stylus
article[itemtype*="ResearchProject"] {
  border-color: var(--color-primary);

  @media (prefers-color-scheme: dark) {
    border-color: var(--blue);
    background-color: var(--surface);
  }
}
```
