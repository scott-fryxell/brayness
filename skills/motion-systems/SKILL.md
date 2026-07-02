---
name: motion-systems
description: Use when designing or implementing motion for web interfaces, including CSS transitions and keyframes, `linear()` easing design, transform strategy (`translate`/`rotate` vs `transform`/`translate3d()`), and deep View Transitions API patterns for route and state continuity.
metadata:
  category: Design & Frontend
  pairs-with:
  - skill: motion-choreography-patterns
    reason: Sibling skill — this covers mechanism selection and tokens; choreography covers multi-element sequencing
  - skill: user-interface
    reason: UX decides what state changes need motion; this skill decides how they move
  - skill: html
    reason: Native HTML attributes (open, disabled) drive state changes that CSS transitions respond to
  - skill: realness-design
    reason: Animation decisions for realness projects — realness defers entirely to this skill
---

# CSS Motion Systems

## Overview

This skill provides a production-oriented motion system for web UI work. It is focused on interaction clarity, performance, and accessibility, not decorative animation.

Use this skill to design and implement motion that:

- Preserves spatial continuity between states
- Communicates hierarchy and focus
- Uses performant properties (`transform`, `opacity`)
- Provides reduced-motion alternatives
- Uses View Transitions API intentionally for page/state continuity

## When to Use

- Building or refining interaction motion in product UI
- Choosing between CSS transition, keyframes, WAAPI, and View Transitions API
- Creating route transitions or list/detail shared element transitions
- Defining motion tokens (duration, distance, easing) for a design system
- Reviewing motion quality, performance, and accessibility

## When NOT to Use

- Static content with no interaction/state change
- Cases where motion increases cognitive load without adding clarity
- Situations requiring immediate state updates where any delay harms usability

## Motion Goals

Each proposal should satisfy at least one of these goals:

1. **Continuity** - where things came from and where they go
2. **Feedback** - action acknowledged with clear response
3. **Hierarchy** - what changed most and why
4. **Focus Guidance** - attention moves to the right target

## Mechanism Selection

Choose the lightest mechanism that satisfies the interaction:

- **CSS transition** - state changes on a single element/component (hover, open/close, selected state)
- **CSS keyframes** - multi-stage timeline or repeated motion (loading, attention pulse, choreography)
- **WAAPI** - imperative sequencing, playback control, cancel/reverse sync with logic
- **View Transitions API** - continuity across DOM swaps, route changes, or layout mode changes

## Transform Strategy

### `translate:` / `rotate:` / `scale:` (individual properties)

Use individual transform properties when:

- You want composable state layers (base styles + state overrides)
- Different interactions control different transform channels
- You need clearer design-token mapping and maintainability

### `transform:` shorthand

Use shorthand when:

- Transform order is intentionally coupled
- You combine multiple functions in one declaration and must preserve exact sequence
- You need functions not exposed as individual props in your target browser strategy

### `translate3d()` and 3D transforms

Use `translate3d()` only when:

- You need actual 3D/perspective behavior
- You have profiled a measurable compositor benefit in a real bottleneck

Avoid using `translate3d()` as a blanket "GPU hack". It can increase layer memory and produce jank if overused.

## Easing System (Including `linear()`)

### Default guidance

- Use `cubic-bezier()` for most product interactions
- Use `linear()` for piecewise velocity control and custom motion signatures
- Tokenize easing values and reuse consistently

### Where `linear()` shines

- Spring-like settle without JS spring physics
- Controlled overshoot/settle curves
- Brand motion signatures with explicit velocity shaping

Keep point counts intentional (typically 4-8 points). Prefer readable named tokens over ad-hoc per-component values.

### `linear()` examples by intent

```css
:root {
  --ease-linear-enter-soft: linear(0, 0.08 12%, 0.34 36%, 0.74 66%, 0.93 84%, 1);
  --ease-linear-exit-crisp: linear(0, 0.3 18%, 0.72 58%, 0.9 78%, 1);
  --ease-linear-settle-gentle: linear(0, 0.06 10%, 0.31 32%, 0.72 62%, 0.92 82%, 1);
  --ease-linear-emphasis-pop: linear(0, 0.38 20%, 0.88 62%, 1);
}

.chip-enter {
  transition: opacity 180ms var(--ease-linear-enter-soft),
    translate 180ms var(--ease-linear-enter-soft);
}

.panel-exit {
  transition: opacity 150ms var(--ease-linear-exit-crisp),
    transform 150ms var(--ease-linear-exit-crisp);
}

.shared-element-settle {
  transition: transform 320ms var(--ease-linear-settle-gentle);
}

.cta-emphasis {
  transition: transform 170ms var(--ease-linear-emphasis-pop);
}
```

See: [references/LINEAR_EASING_PATTERNS.md](references/LINEAR_EASING_PATTERNS.md)

## View Transitions API (Deep Use)

### Same-document transitions

- Wrap the DOM/state update in `document.startViewTransition(() => update())`
- Name only meaningful shared elements with `view-transition-name`
- Style transition pseudo-elements intentionally

### Cross-document transitions

- Opt in with `@view-transition { navigation: auto; }`
- Keep shared element naming consistent across pages
- Ensure entry/exit states remain meaningful when transition is unavailable

### Key pseudo-elements

- `::view-transition-old(root)` / `::view-transition-new(root)`
- `::view-transition-old(name)` / `::view-transition-new(name)`
- `::view-transition-group(name)`

### Failure and fallback behavior

- Feature-detect and fall back to standard state updates
- Respect reduced motion by removing spatial travel and keeping clear state change
- Never block core interactions while waiting for transition effects

See: [references/VIEW_TRANSITION_RECIPES.md](references/VIEW_TRANSITION_RECIPES.md)

## Performance Rules

- Prefer animating `transform` and `opacity`
- Avoid animating layout-affecting props for core interactions (`top`, `left`, `width`, `height`)
- Minimize long-running infinite animations on large surfaces
- Use `will-change` sparingly and remove when not needed
- Profile before and after changes (frame stability, long tasks, layer count)

## Accessibility Rules

- Support `@media (prefers-reduced-motion: reduce)`
- Replace big travel/zoom with fade or instant state change when reduced motion is requested
- Keep feedback timing responsive; avoid long delays before state confirmation
- Ensure focus order, focus visibility, and keyboard behavior remain correct during/after transitions

## Timing Heuristics

- Micro interactions: `120-180ms`
- Component transitions: `180-260ms`
- Structural/layout/route transitions: `240-420ms`
- Exits generally faster than enters

## Interaction Design Heuristics

- Use motion to explain state change, not decorate it
- Stagger only when it improves scannability or hierarchy
- Keep directional logic consistent with layout flow
- Prefer fewer, coherent motion patterns over many unique effects

## Output Contract

When using this skill, produce these five sections:

1. **Intent** - what user perception or behavior the motion should drive
2. **Motion Spec** - duration, easing token, distance, trigger, affected elements
3. **Implementation** - concrete CSS/JS/View Transition code
4. **Accessibility Fallback** - reduced-motion and unsupported API behavior
5. **QA Checklist** - performance, usability, and cross-device verification

## Starter Tokens

Use these baseline tokens and adapt to the product:

See: [references/MOTION_TOKENS.css](references/MOTION_TOKENS.css)

## Review Checklist

Before shipping, run through:

See: [references/MOTION_REVIEW_CHECKLIST.md](references/MOTION_REVIEW_CHECKLIST.md)
