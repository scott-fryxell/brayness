# Fluid modular type scale: the recipe

Four inputs, one formula, one CSS function. This is the method behind
`BASELINE_STARTER.css` and realness's own type scale — pick your four inputs,
run the formula, paste the result.

## The four inputs

1. **min-ratio** — the modular ratio at small viewports.
2. **max-ratio** — the modular ratio at large viewports (usually bigger than
   min-ratio: headings get _more_ dramatic on more room, not less).
3. **small-viewport** — the width below which sizing stops shrinking.
4. **large-viewport** — the width above which sizing stops growing.

A ratio is just "how much bigger is the next heading step." 1.25 means h4 is
1.25× body text, h3 is 1.25× h4, and so on.
[type-scale.com](https://type-scale.com/) is a fast way to preview a ratio
before committing to it.

## The formula

For heading level _N_ steps above body text, at a given ratio:

```
bound = 1rem × ratio^N
```

`h1` is usually 4 steps up, `h2` 3, `h3` 2, `h4` 1, `h5` the body size itself (0
steps), `h6` one step _down_ (`N = -1`, i.e. `1rem / ratio`).

Compute this twice per heading — once with min-ratio, once with max-ratio — and
you have the two bounds `clamp()` needs.

## The gotcha: h6's bounds invert

Every heading from h1–h4 gets _bigger_ as ratio increases, so
`min-ratio^N < max-ratio^N` always holds and the two bounds land in the order
`clamp()` expects. h6 divides instead of multiplying (`1rem / ratio`), so a
_bigger_ ratio makes it _smaller_ — which means `min-ratio`'s h6 value is
numerically larger than `max-ratio`'s.

`clamp(MIN, VAL, MAX)` is specified as `max(MIN, min(VAL, MAX))`. If you hand it
bounds in the wrong numeric order (`MIN > MAX`), it doesn't error — it silently
collapses to a constant `MIN` at every viewport width, because `min(VAL, MAX)`
can never exceed `MAX`, and `MAX < MIN` means `MIN` always wins. This is a real
bug that shipped in realness's own migration from a media-query technique to
`clamp()`: h6 was pinned at a flat size for a while because the two bounds were
passed to `clamp()` in the same order as every other heading, without noticing
this one inverts.

The fix is mechanical: for h6 only, swap which bound goes in `clamp()`'s first
slot vs. third slot. The `calc()` interpolation in the middle doesn't change —
it's still linearly decreasing from the small-viewport value to the
large-viewport value. Only the _outer_ clamp bounds need to be in ascending
numeric order.

```css
/* h1–h4: numeric order matches conceptual order */
font-size: clamp(var(--h4-min), calc(...), var(--h4-max));

/* h6: numeric order is reversed from conceptual order */
font-size: clamp(var(--h6-max), calc(...), var(--h6-min));
```

Whenever you add a heading step below the body size, check this before shipping
it.

## The `clamp()` formula itself

Once you have a `min` and `max` bound for one property, the slope-intercept form
fills in everything between the two viewport thresholds:

```css
font-size: clamp(
  min,
  calc(
    min + (max - min) * (100dvw - small-viewport) /
      (large-viewport - small-viewport)
  ),
  max
);
```

At `small-viewport`, the `calc()` evaluates to exactly `min`. At
`large-viewport`, exactly `max`. Between them, linear. Outside them, `clamp()`'s
outer bounds take over so it never over- or under-shoots. This is one native CSS
function doing what used to take three separate media-query breakpoints per
property — same math, no jumps, no per-property media queries to keep in sync.

## Worked example: realness's own history

realness didn't arrive at its current ratios in one shot — the git history shows
three iterations:

| min-ratio | max-ratio | commit                                                              |
| --------- | --------- | ------------------------------------------------------------------- |
| 1.125     | 1.333     | initial                                                             |
| 1.2       | 1.333     | intermediate                                                        |
| 1.25      | 1.414     | "Playing with modular scale and minimum font size" (2019) — current |

Each pass widened the spread between small- and large-viewport sizing — the
project's headings got more dramatic on desktop over time, without ever touching
the underlying formula. That's the point of separating the method from the
numbers: the `clamp()`/whole-multiple machinery didn't change across three
rounds of "does this feel right," only the four inputs did.

realness's current bounds, for reference (min-ratio 1.25, max-ratio 1.414,
thresholds 35rem/80rem):

```
h1: 2.441rem → 3.998rem
h2: 1.953rem → 2.827rem
h3: 1.563rem → 1.999rem
h4: 1.25rem → 1.414rem
h5: 1rem (constant)
h6: 0.8rem → 0.707rem  (bounds swapped in clamp(), per the gotcha above)
body: 1.125rem → 1.33rem  (its own pair, not derived from the heading ratios)
```
