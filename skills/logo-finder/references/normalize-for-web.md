# Normalize for web

SVGL returns SVGO-optimized SVG. Additional steps depend on surface.

## Multicolor marks (default from SVGL)

Keep fills. Do not blanket-convert to `currentColor`.

## Single-color UI icons (rare for brands)

Only when the brand allows monochrome and the design is single-hue:

- Replace fixed fills with `currentColor`
- Set `fill="currentColor"` on root or paths

## Sprite insertion (`icons.svg`)

1. Copy inner markup (no outer `<svg>` wrapper) into `<symbol id="{slug}" viewBox="...">`.
2. Remove fixed `width`/`height` on root if present; keep `viewBox`.
3. Deduplicate `id` attributes inside paths (clipPath, gradients) - prefix with slug.

## File storage

- Path: `{out_dir}/{slug}.svg` (default `public/brands/` for Vite; see the SKILL.md framework table)
- Slug: lowercase, hyphenated
- Commit SVGs with the repo; the live site does not call SVGL at runtime

## Accessibility

| Pattern                                    | alt               |
| ------------------------------------------ | ----------------- |
| Logo + visible product name nearby         | `alt=""`          |
| Logo strip only                            | `alt="{Brand}"`   |
| Decorative row with `aria-label` on `<ul>` | empty alt per img |

## CSS

```css
.integration-logo {
  height: 1.25em;
  width: 1.25em;
  object-fit: contain;
}
```

Avoid animating logo opacity separately from the name unless motion skill calls for it.
