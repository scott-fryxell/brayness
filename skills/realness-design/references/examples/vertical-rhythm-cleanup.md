# Worked example: trusting the cascade instead of restating it

A real cleanup pass on realness's `Colors.vue`, kept here because the bug pattern is generic: a component re-declares spacing that the base system already provides, and the restatement quietly drifts from the system default over time.

## The symptom

```css
section#colors > article > header > h2,
section#colors > details > header > h2 {
  margin: 0 0 0.6665rem;
}
```

`0.6665rem` is `base-line * 0.5` — a fractional vertical multiple, which already breaks vertical harmony on its own. But looking closer, the base system's global heading rule already sets:

```css
h1, h2, h3, h4, h5, h6 {
  margin-bottom: var(--base-line);
}
```

So this component wasn't just using the wrong number — it was restating a property the cascade already handles, and the restated value had drifted to half of what the system default actually was. Nobody had to intend that; it's what happens when a value gets typed once, by hand, instead of inherited.

## The fix

Only one part of that rule was actually doing new work: the component wanted `margin-top: 0` (this h2 is the first element inside a `<header>`, so it shouldn't get the system's usual multi-baseline top gap). Everything else was noise:

```css
section#colors > article > header > h2,
section#colors > details > header > h2 {
  margin-top: 0;
}
```

The `margin-bottom` now comes from the global `h1–h6` rule again, correctly, without anyone having to keep two numbers in sync.

## The general check

Before writing `margin`/`padding` on any element, ask: does the base system already set this property on this element (directly, or via a reset)? If yes, and the value matches, delete the restatement — you're not saving anything by keeping it, and you're one hand-edit away from silent drift. If yes, but you need a *different* value, write only the properties that actually differ, not the whole shorthand.

The universal reset is a special case of "the base system already sets this": every element gets `margin: 0; padding: 0;` before any other rule runs, so `margin: 0;` (or `padding: 0;`) on an element with no more specific rule is *always* redundant, not just sometimes. `Colors.vue` had six of these (on `ol`, `figure`, `article`) that were pure noise — the reset already got there first.
