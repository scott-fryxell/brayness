# View Transition Recipes

## Same-Document Transition (SPA or State Swap)

```js
function updateLayout(nextMode) {
  const runUpdate = () => {
    document.documentElement.dataset.layout = nextMode;
  };

  if (!document.startViewTransition) {
    runUpdate();
    return;
  }

  document.startViewTransition(runUpdate);
}
```

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: var(--motion-duration-structural);
  animation-timing-function: var(--ease-standard);
}

.card__image {
  view-transition-name: card-image;
}

.detail__image {
  view-transition-name: card-image;
}

::view-transition-group(card-image) {
  animation-duration: var(--motion-duration-route);
  animation-timing-function: var(--ease-linear-soft-settle);
}
```

## Cross-Document Transition (MPA Navigation)

```css
@view-transition {
  navigation: auto;
}

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: var(--motion-duration-route);
  animation-timing-function: var(--ease-standard);
}
```

Use consistent `view-transition-name` values on matching elements across both pages.

## Reduced-Motion Fallback

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root),
  ::view-transition-group(*) {
    animation-duration: 1ms;
    animation-timing-function: linear;
  }
}
```

## Best Practices

- Transition only meaningful shared elements
- Keep update callbacks synchronous and deterministic
- Avoid style/DOM work inside transition callback that can cause long tasks
- Preserve usability if transition is skipped
