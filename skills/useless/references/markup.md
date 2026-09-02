# Markup

The element side of the system. Selector rules, the class carve-out, microdata,
and native-state attributes live in [SKILL.md](../SKILL.md) - this file covers
choosing and structuring the elements themselves.

Use the most appropriate element for the content and interaction. Do not apply
these rules mechanically; the best element is the one that most accurately
reflects what the content is, not the most specialized one available.

## Decision order

1. Choose the element that best matches the content or interaction.
2. Prefer native HTML behavior before custom behavior.
3. Remove wrappers that add no structural value.
4. Ensure labels, headings, landmarks, and image handling are correct.
5. Add ARIA only when native HTML cannot express the needed behavior.

## Headings

- One clear `h1` per page or main view.
- Logical order: `h1`, `h2`, `h3`. Do not skip levels without reason.
- Never use a heading to get large text. That is a type-scale job.

## Landmarks

- Use `main`, `nav`, `header`, `footer`, `aside` where they define page
  structure.
- Do not wrap every small subsection in a landmark. Landmarks aid orientation;
  more of them is not better.

## Lists, articles, and sections

Repetition alone is not list semantics. This is the distinction that gets
mechanical fastest, so it is worth stating plainly.

**`ul` / `ol` / `li`** when membership in a list is the meaning: steps, menu
items, bullet points, grouped items.

**`article`** when each repeated item stands on its own - it has its own
heading, metadata, or actions. Cards, posts, results, stories, entries.

**`section`** when content is grouped by theme or purpose and benefits from its
own heading. Thematic grouping, not list membership.

**A plain container** when the markup is mainly layout and list or landmark
semantics would be artificial.

Avoid: wrapping card grids in `ul` / `li` by default, using `li` for any
repeated component pattern, forcing semantics onto layout-only structure.

## Forms

- Every input needs an associated label. Placeholder text is not a label.
- Correct `type` values; `name` for submitted fields.
- `fieldset` and `legend` for grouped inputs.
- Mark required fields with the HTML attribute, not only with text.

## Links and buttons

- `a` when going somewhere, `button` when doing something.
- Never a clickable `div` or `span` in place of a button.
- Never a button for plain navigation without a real app-style reason.

## Images

- `alt=""` for decorative images, descriptive `alt` for informative ones.
- Provide width and height where possible to reduce layout shift.
- `figure` and `figcaption` when the caption is part of the content.

## Native elements before custom ones

Prefer `button`, `details`, `summary`, `dialog`, `input`, `select`, `fieldset`,
`table` over rebuilt equivalents. Rebuilding a native control means
reimplementing its keyboard handling, focus behavior, and accessibility
semantics, usually incompletely.

## Document metadata

For full documents: `<!doctype html>`, `lang` on `html`, `meta charset="utf-8"`,
`meta name="viewport" content="width=device-width, initial-scale=1"`, a
meaningful `title`. For component files, add document metadata only through the
framework's mechanism - never `html`, `head`, or `body` tags inside a component.

## Avoid semantic overfitting

"Semantic HTML" does not mean using the most specialized element possible
everywhere. A simple structure with a few plain containers beats incorrect
semantics. Start with the smallest correct structure and add elements only when
they improve meaning, accessibility, or maintainability - not just in case.

## Anti-patterns

- `div` used for buttons or links
- ARIA added where native HTML already works
- inputs without labels
- headings used for styling
- deeply nested wrapper chains (div soup)
- tables for layout
- inline event handler strings like `onclick="..."`
- card layouts wrapped in `ul` / `li` by default
- extra landmarks with no navigational value

## Heuristics

- Can each element justify why it exists?
- Is there a semantic element that should replace this `div`?
- Would this still make sense without CSS?
- Can a screen reader understand the structure?
- Are actions buttons and destinations links?
- Is the heading order logical?
- Are forms fully labeled and grouped?
- Is any ARIA actually necessary?
- Is this truly a list, or just repeated content?
- Does each repeated item stand alone enough to be an `article`?
- Am I choosing this element because it is accurate, or because it is a rule I
  memorized?
