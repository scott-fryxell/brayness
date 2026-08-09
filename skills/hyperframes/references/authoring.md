# Authoring Reference

The attribute API, composition structure, variables, and media rules. Moved
here from SKILL.md; the non-negotiable rules stay there.

## Data attributes

### All clips

| Attribute          | Required                          | Values                                                 |
| ------------------ | --------------------------------- | ------------------------------------------------------ |
| `id`               | Yes                               | Unique identifier                                      |
| `data-start`       | Yes                               | Seconds or clip ID reference (`"el-1"`, `"intro + 2"`) |
| `data-duration`    | Required for img/div/compositions | Seconds. Video/audio defaults to media duration.       |
| `data-track-index` | Yes                               | Integer. Same-track clips cannot overlap.              |
| `data-media-start` | No                                | Trim offset into source (seconds)                      |
| `data-volume`      | No                                | 0-1 (default 1)                                        |

`data-track-index` does **not** affect visual layering - use CSS `z-index`.

### Composition clips

| Attribute                    | Required | Values                                                            |
| ---------------------------- | -------- | ----------------------------------------------------------------- |
| `data-composition-id`        | Yes      | Unique composition ID                                             |
| `data-start`                 | Yes      | Start time (root composition: use `"0"`)                          |
| `data-duration`              | Yes      | Takes precedence over GSAP timeline duration                      |
| `data-width` / `data-height` | Yes      | Pixel dimensions (1920x1080 or 1080x1920)                         |
| `data-composition-src`       | No       | Path to external HTML file                                        |
| `data-variable-values`       | No       | JSON object of per-instance variable overrides on a sub-comp host |

On the root `<html>` element:

| Attribute                    | Required | Values                                                                                                                         |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `data-composition-variables` | No       | JSON array of declared variables (id/type/label/default) - drives Studio editing UI and provides defaults for `getVariables()` |

## Composition structure

Sub-compositions loaded via `data-composition-src` use a `<template>`
wrapper. **Standalone compositions (the main index.html) do NOT use
`<template>`** - they put the `data-composition-id` div directly in
`<body>`. Using `<template>` on a standalone file hides all content from the
browser and breaks rendering.

Sub-composition structure:

```html
<template id="my-comp-template">
  <div data-composition-id="my-comp" data-width="1920" data-height="1080">
    <!-- content -->
    <style>
      [data-composition-id="my-comp"] {
        /* scoped styles */
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // tweens...
      window.__timelines["my-comp"] = tl;
    </script>
  </div>
</template>
```

Load in root: `<div id="el-1" data-composition-id="my-comp" data-composition-src="compositions/my-comp.html" data-start="0" data-duration="10" data-track-index="1"></div>`

## Variables (parametrized compositions)

Render the same composition with different content - title, theme color,
prices, captions - without editing the source HTML.

**Three-step pattern:**

1. **Declare** variables on the composition's `<html>` root with
   `data-composition-variables`. Each entry needs `id`, `type` (one of
   `string`, `number`, `color`, `boolean`, `enum`), `label`, and `default`.
   Enum entries also need `options: [{value, label}, ...]`.
2. **Read** the resolved values inside the composition's script with
   `window.__hyperframes.getVariables()`. Returns the merged result of
   declared defaults + per-instance overrides + CLI overrides.
3. **Override** at render time with `npx hyperframes render --variables
   '{...}'` (top-level) or with `data-variable-values='{...}'` on the host
   element (per-instance for sub-comps).

```html
<!doctype html>
<html
  data-composition-variables='[
  {"id":"title","type":"string","label":"Title","default":"Hello"},
  {"id":"theme","type":"enum","label":"Theme","default":"light","options":[
    {"value":"light","label":"Light"},
    {"value":"dark","label":"Dark"}
  ]}
]'
>
  <body>
    <div data-composition-id="root" data-width="1920" data-height="1080">
      <h1 id="hero" class="clip" data-start="0" data-duration="3"></h1>
      <script>
        const { title, theme } = window.__hyperframes.getVariables();
        document.getElementById("hero").textContent = title;
        document.body.dataset.theme = theme;
      </script>
    </div>
  </body>
</html>
```

```bash
# Dev preview uses declared defaults
npx hyperframes preview

# Render with overrides
npx hyperframes render --variables '{"title":"Q4 Report","theme":"dark"}' --output q4.mp4

# Or from a JSON file
npx hyperframes render --variables-file ./vars.json
```

**Sub-composition per-instance values:** the same `getVariables()` works
inside sub-comps loaded via `data-composition-src`. Each host element passes
its own values:

```html
<div
  data-composition-id="card-pro"
  data-composition-src="compositions/card.html"
  data-variable-values='{"title":"Pro","price":"$29"}'
></div>
<div
  data-composition-id="card-enterprise"
  data-composition-src="compositions/card.html"
  data-variable-values='{"title":"Enterprise","price":"Custom"}'
></div>
```

The runtime layers each host's `data-variable-values` over the sub-comp's
declared defaults per instance, so the same source can be embedded multiple
times with different content.

**Rules of thumb:**

- Always provide a sensible `default` for every declared variable. Dev
  preview uses defaults - without them, the composition won't render
  correctly until `--variables` is provided.
- Read variables once at the top of the script (`const { title } = ...`),
  not inside frame loops or event handlers - `getVariables()` allocates a
  fresh object per call.
- Use `--strict-variables` in CI to fail fast on undeclared keys or type
  mismatches.
- Variable types are validated at render time. `string`, `number`,
  `boolean`, and `color` (hex string) check `typeof`; `enum` checks the
  value is in the declared `options`.

## Layout example (end state first)

```css
/* scene-content fills the scene, padding positions content.
   Works for any scene size (1920x1080, 1080x1920, ...). */
.scene-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 120px 160px;
  gap: 24px;
  box-sizing: border-box;
}
.title {
  font-size: 120px;
}
```

WRONG - hardcoded dimensions and absolute positioning:

```css
.scene-content {
  position: absolute;
  top: 200px;
  left: 160px;
  width: 1920px;
  height: 1080px;
}
```

Then animate INTO the CSS positions (entrances), and OUT of them only on
the final scene:

```js
tl.from(".title", { y: 60, opacity: 0, duration: 0.6, ease: "power3.out" }, 0);
tl.from(".subtitle", { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.2);

// Final scene only:
tl.to(".title", { y: -40, opacity: 0, duration: 0.4, ease: "power2.in" }, 3);
```

## Video and audio

Video must be `muted playsinline`. Audio is always a separate `<audio>`
element:

```html
<video
  id="el-v"
  data-start="0"
  data-duration="30"
  data-track-index="0"
  src="video.mp4"
  muted
  playsinline
></video>
<audio
  id="el-a"
  data-start="0"
  data-duration="30"
  data-track-index="2"
  src="video.mp4"
  data-volume="1"
></audio>
```

## Typography and assets

- **Built-in fonts:** write the `font-family` you want in CSS - the
  compiler embeds supported fonts automatically.
- **Custom fonts:** if design.md names a font that isn't built-in, the user
  must provide `.woff2` files in a `fonts/` directory. If missing, warn
  before writing HTML. When files exist, add `@font-face` declarations
  pointing to the local files.
- Add `crossorigin="anonymous"` to external media.
- For dynamic text overflow, use
  `window.__hyperframes.fitTextFontSize(text, { maxWidth, fontFamily, fontWeight })`.
- All files live at the project root alongside `index.html`;
  sub-compositions use `../`.
