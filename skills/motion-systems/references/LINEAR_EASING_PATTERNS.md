# `linear()` Easing Patterns

Use CSS `linear()` when you need explicit control over velocity progression across time.

## When to Prefer `linear()`

- You need nuanced accelerate/decelerate segments
- You want spring-like settle without JS spring runtime
- You are creating motion tokens shared across many components

## Design Workflow

1. Define the perception goal (snappy settle, soft settle, assertive emphasis)
2. Start with 4 points, then refine to 6-8 only if needed
3. Keep inflection points intentional and named
4. Validate on real UI, not isolated demos only

## Example Tokens

```css
:root {
  --ease-linear-snappy: linear(0, 0.18 20%, 0.68 58%, 0.92 82%, 1);
  --ease-linear-soft: linear(0, 0.06 12%, 0.3 34%, 0.72 63%, 0.92 84%, 1);
  --ease-linear-emphasis: linear(0, 0.3 18%, 0.86 62%, 1);
  --ease-linear-exit-crisp: linear(0, 0.32 20%, 0.74 60%, 0.92 82%, 1);
  --ease-linear-settle-gentle: linear(0, 0.05 10%, 0.28 30%, 0.67 60%, 0.9 82%, 1);
  --ease-linear-snap-pop: linear(0, 0.42 22%, 0.9 66%, 1);
}
```

## Applied Examples

### 1) Card Enter (soft, readable)

```css
.card {
  transition: opacity 200ms var(--ease-linear-soft),
    translate 200ms var(--ease-linear-soft);
}

.card[data-state="from-below"] {
  opacity: 0;
  translate: 0 10px;
}
```

### 2) Popover Exit (crisp, fast)

```css
.popover {
  transition: opacity 150ms var(--ease-linear-exit-crisp),
    transform 150ms var(--ease-linear-exit-crisp);
}

.popover[data-state="closed"] {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}
```

### 3) Shared Element Settle (route/state continuity)

```css
::view-transition-group(card-image) {
  animation-duration: 340ms;
  animation-timing-function: var(--ease-linear-settle-gentle);
}
```

### 4) CTA Emphasis Pulse (single, non-looping)

```css
@keyframes cta-pulse {
  0% {
    transform: scale(1);
  }
  55% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}

.cta[data-emphasis="true"] {
  animation: cta-pulse 220ms var(--ease-linear-snap-pop) 1;
}
```

### 5) Progress Indicator (constant velocity)

Use classic `linear` (keyword) when you need constant speed with no easing curvature.

```css
.progress-bar {
  transition: inline-size 240ms linear;
}
```

## Pairing Recommendations

- Enter transitions: `--ease-linear-soft` or `--ease-standard`
- Exit transitions: faster `--ease-exit` or short linear profile
- Emphasis interactions: `--ease-linear-emphasis` with short durations
- Shared element transitions: `--ease-linear-settle-gentle` around `280-380ms`

## Common Mistakes

- Too many points with no measurable UX benefit
- Different custom curves for every component
- Long durations with complex curves on frequent interactions
- Ignoring reduced-motion alternatives
- Using `linear()` where constant velocity (`linear`) is actually the intent
