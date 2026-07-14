# Worked example: a breakpoint gate is not a content limit

Two custom properties that look interchangeable — both are "a big horizontal number derived from the spacing unit" — but conflating them breaks in two different, non-obvious ways.

## The setup

realness already had `page-width-large` (a breakpoint gate — a value a `@media (min-width: ...)` condition checks against, used to bump card sizes up on wide screens). A page needed a wide, grid-heavy container capped at a sensible max width. `page-width-large` was the only "big width" custom property around, so it got reused:

```css
section#colors > article,
section#colors > details {
  max-width: page-width-large; /* 43rem */
}
```

This compiled fine and looked plausible in review. It was wrong.

## Why it was wrong

`page-width-large` (43rem) was tuned as a *breakpoint* — the width at which `standard-grid()` and similar layouts decide there's enough room to grow. It was never tuned as a *content ceiling*. Using it as `max-width` capped the page's wide swatch grids at 43rem, noticeably narrower than the ~64rem the page actually needed for its content to breathe — a real, visible regression that only showed up once someone looked at the rendered page next to the older version.

Separately, the same page had *another* spot using an un-named literal, `base-line * 48` (also ≈64rem, coincidentally the width that was actually wanted) — a magic number nobody had connected to anything.

## The fix

Two different problems needed two different fixes, not one shared value:

```css
/* the existing breakpoint - unchanged, still just a gate */
--page-width-large: 43rem;

/* a new, distinct custom property - a cap, not a gate */
--page-width-max: 64rem;
```

The page's container went back to `max-width: var(--page-width-max)`, and the other page's `base-line * 48` literal was replaced with the same named custom property, so the next reader sees "wide content ceiling" instead of an unexplained `48`.

## The general check

When two numbers are close in magnitude, ask what each one *does* before reusing either: does a `@media`/`@container` condition check against it (a gate), or does a box's `max-width`/`min-width` read it directly (a limit)? Those are different jobs even when the numbers happen to be similar, and a name meant for one job silently doing the other's work is a bug that won't show up in a diff — only in the rendered page.
