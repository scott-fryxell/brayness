---
name: html
description: Writes and reviews semantic, accessible HTML and template markup that stays readable and low-noise. Use when creating or refactoring HTML or Svelte templates, cleaning up div soup, choosing better elements, improving form markup, fixing heading or landmark structure, or replacing custom controls with native HTML.
metadata:
  category: Frontend & Accessibility
  pairs-with:
    - skill: realness-design
      reason: Element-first CSS architecture — the HTML element choice is the CSS selector
    - skill: typography
      reason: Element choice carries typographic meaning before CSS touches it
    - skill: user-interface
      reason: Clarity and affordance start with the right element
  tags:
    - html
    - semantics
    - accessibility
    - microdata
    - forms
    - markup
---

# HTML

Write HTML that is semantic, accessible, maintainable, and easy to scan. Prefer simple structure, meaningful elements, and minimal wrapper noise.

## Core Principle

Use the most appropriate HTML element for the content and interaction. Do not apply best practices mechanically.

## When to Use This Skill

Use this skill when:

- writing raw HTML or template markup
- refactoring noisy or wrapper-heavy markup
- improving semantics, landmarks, or heading structure
- fixing form labeling and control choice
- deciding between `div`, `section`, `article`, `ul`, and other structural elements
- replacing custom interactions with better native HTML
- cleaning up Svelte component markup without changing its behavior

Do not use this skill for:

- pure CSS architecture decisions
- JavaScript behavior design unless the HTML choice is the root issue
- marketing copy or content strategy
- deep framework-specific state or reactivity changes unrelated to markup structure

## Decision Order

When writing or reviewing markup:

1. choose the element that best matches the content or interaction
2. prefer native HTML behavior before custom behavior
3. remove wrappers that add no structural value
4. ensure labels, headings, landmarks, and image handling are correct
5. add ARIA only when native HTML cannot express the needed behavior

## Template Safety

When the markup lives inside Svelte or another HTML-like template language:

- treat the file as template markup, not as a plain standalone HTML document
- preserve framework syntax such as `{#if}`, `{#each}`, `{:else}`, `{@html}`, `bind:`, `class`, `style:`, event attributes, and special elements like `<svelte:head>`
- do not replace components or capitalized tags with native elements unless the task explicitly asks for that change
- improve the HTML around directives and blocks without breaking bindings, keys, control flow, or component boundaries
- apply full-document rules like `<!doctype html>`, `html`, `head`, and `body` only when the file is actually a document shell
- in Svelte, treat compiler accessibility warnings as useful guardrails and do not add `svelte-ignore` comments casually

## Rules

### 1. Prefer Semantic Elements

- Use semantic tags whenever they accurately match the content:
  - `header`
  - `main`
  - `section`
  - `article`
  - `nav`
  - `aside`
  - `footer`
  - `button`
  - `form`
  - `label`
- Do not use `div` when a semantic element is clearly better
- Do not force a semantic element where a plain container is more accurate

### 2. Structure Content by Meaning

- HTML should describe content structure, not visual appearance
- Choose elements based on what the content is
- Do not choose elements based on default browser styles
- Do not invent extra structure just to satisfy a rule

### 3. Keep Nesting Shallow

- Avoid unnecessary wrappers
- Prefer flatter, easier-to-read markup
- Every extra layer should have a real structural, behavioral, or styling purpose

### 4. Heading Hierarchy Must Make Sense

- Use one clear `h1` for the page or main view
- Follow a logical heading order:
  - `h1`
  - `h2`
  - `h3`
- Do not skip heading levels without reason
- Do not use headings just to create large text

### 5. Accessibility Is Required

- Always use proper labels for form controls
- Use `button` for actions and `a` for navigation
- Add meaningful `alt` text to informative images
- Use ARIA only when native HTML cannot solve the problem
- Do not add unnecessary ARIA

### 6. Prefer Native HTML Behavior

- Use built-in HTML features before custom solutions
- Prefer:
  - `button`
  - `details`
  - `summary`
  - `dialog`
  - `input`
  - `select`
  - `fieldset`
  - `table`
- Avoid rebuilding native controls with generic elements
- Native boolean attributes (`open`, `disabled`, `checked`, `hidden`) carry application state — prefer them over JS-managed classes. CSS reads them directly without JavaScript (see **realness-design** for the selector patterns)

### 7. Write Readable Markup

- Keep formatting consistent
- Use clear indentation
- Keep attributes readable
- Break lines when markup becomes hard to scan
- Optimize for humans reading the source

### 8. Avoid Class Names - Reach for the Element First

Class names are a last resort, not a default. Before adding a class, ask whether a semantic element, an attribute, or microdata already gives you the hook you need.

- Do not add classes to every element by default
- Reach for the right semantic element or attribute before any selector: `<address>`, `<time>`, `<figure>`, `<nav>`, `<details>`, `<dialog>`
- Prefer element + attribute selectors over classes: `address[itemscope]`, `time[datetime]`, `article[itemtype]`, `input[required]`, `details[open]`, `[aria-*]` - the attribute is already doing real work, let it double as the CSS hook
- Native boolean attributes (`open`, `disabled`, `checked`, `hidden`) carry application state - prefer them over JS-managed classes
- If a class is truly necessary, keep it simple and meaningful - name it after content or function, never presentation alone
- When a no-class design system is in play (e.g. **realness-design**), follow it - no classes at all; the element IS the selector

You should feel resistance before adding a class. If you reach for one, you are usually reaching for the wrong element or missing an existing attribute.

### 9. Avoid Div Soup

- Do not create long chains of anonymous `div` elements
- If many wrappers appear, reconsider the structure
- Simplify before adding more containers
- A plain `div` is fine when no stronger semantic exists

### 10. Forms Must Be Explicit

- Every input needs an associated label
- Use `type` values correctly
- Use `name` for submitted fields
- Use `fieldset` and `legend` for grouped inputs
- Mark required fields with HTML attributes, not only text
- Do not rely on placeholder text as the label

### 11. Use Lists Only When Content Is Truly a List

- Use `ul` / `ol` / `li` when the content is actually a list:
  - steps
  - menu items
  - bullet points
  - grouped items where membership in a list is the important meaning
- Do not use list markup just because content repeats
- Repetition alone is not list semantics

#### Use `article` when:

- each repeated item can stand on its own
- each item has its own heading, metadata, or actions
- the repeated content is more like cards, posts, results, stories, or entries

#### Use `section` when:

- content is grouped by theme or purpose
- the group benefits from its own heading
- the point is thematic grouping, not list membership

#### Use plain containers when:

- the markup is mainly for layout
- there is no stronger semantic meaning
- list or landmark semantics would be artificial

#### Avoid:

- wrapping card grids in `ul` / `li` by default
- using `li` for any repeated component pattern
- forcing semantics onto layout-only structures

### 12. Keep Content and Behavior Separate

- HTML defines structure
- CSS defines presentation
- JavaScript defines behavior
- Avoid inline styles and plain HTML event handler strings like `onclick="..."`
- In template languages, do not mistake framework event attributes for plain inline JS

### 13. Links and Buttons Are Not Interchangeable

- Use `a` when going somewhere
- Use `button` when doing something
- Never use a clickable `div` or `span` instead of a button
- Never use a button for plain navigation unless there is a real app-style reason

### 14. Images Need Intentional Handling

- Use `alt=""` for decorative images
- Use descriptive `alt` for informative images
- Provide width and height when possible to reduce layout shift
- Use `figure` and `figcaption` when the caption is part of the content

### 15. Metadata Matters

- For full HTML documents, include:
  - `<!doctype html>`
  - `lang` on `html`
  - `meta charset="utf-8"`
  - `meta name="viewport" content="width=device-width, initial-scale=1"`
  - meaningful `title`
- For component files or template fragments, add document metadata only through the framework's proper mechanism, such as `<svelte:head>` in Svelte
- Add other metadata only when it serves a clear purpose

### 16. Avoid Semantic Overfitting

- Do not apply rules mechanically
- “Semantic HTML” does not mean using the most specialized element possible everywhere
- The best element is the one that most accurately reflects the content and interaction
- A simple structure with a few plain containers is better than incorrect semantics

### 17. Landmarks Should Be Meaningful

- Use landmarks like `main`, `nav`, `header`, `footer`, and `aside` where they help define page structure
- Do not wrap every small subsection in landmark elements
- Landmarks should help orientation, not create noise

### 18. Prefer Minimal Honest Markup

- Start with the smallest correct structure
- Add elements only when they improve meaning, accessibility, or maintainability
- Do not add wrappers, labels, or semantics just in case

## Microdata as semantic extension

Microdata attributes (`itemscope`, `itemtype`, `itemprop`, `itemid`) extend HTML semantics without adding classes. When content has schema meaning, express it — it serves CSS, search engines, and any data layer simultaneously.

```html
<!-- the element, the schema, and the CSS hook are the same thing -->
<address itemscope itemtype="http://schema.org/Person" itemid="/people/scott">
  <h3 itemprop="name">Scott Fryxell</h3>
</address>

<article itemscope itemtype="http://schema.org/BlogPosting">
  <h2 itemprop="headline">always get a DOM</h2>
  <time itemprop="datePublished" datetime="2022-01-22">January 22, 2022</time>
</article>
```

```css
/* selects on the attribute that already exists — no extra class needed */
address[itemscope] {
  font-style: normal;
}
article[itemtype] {
  /* ... */
}
```

Use `itemprop` to name values that have schema meaning: `name`, `headline`, `datePublished`, `description`, `author`. Use `datetime` on `<time>` — it carries machine-readable data while the element displays the human-readable form.

## Integration

- **realness-design**: the element you choose IS the CSS selector — coordinate element choice with the CSS architecture
- **typography**: element choice carries typographic meaning before CSS — `<time>`, `<address>`, `<blockquote>`, `<h1>`–`<h6>` all have typographic implications
- **user-interface**: affordance and clarity start here — the right element often makes the UX obvious without any additional design work

## Anti-Patterns

- using `div` for buttons or links
- adding ARIA when native HTML already works
- skipping labels on inputs
- using headings for styling only
- deeply nested wrapper elements
- using tables for layout
- plain HTML inline event handler strings like `onclick="..."`
- rewriting valid Svelte directives or blocks as if they were broken HTML
- adding `html`, `head`, or `body` tags inside component files
- meaningless class names like `box1`, `red_text`, `left_side`
- wrapping card layouts in `ul` / `li` by default
- using semantic elements only because content repeats
- adding extra landmarks with no navigational value
- placeholder text used instead of labels

## Heuristics

- can each element justify why it exists?
- is there a semantic element that should replace this `div`?
- would this still make sense without CSS?
- can a screen reader understand the structure?
- are actions buttons and destinations links?
- is the heading order logical?
- are forms fully labeled and grouped correctly?
- is any ARIA actually necessary?
- is this truly a list, or just repeated content?
- does each repeated item stand alone enough to be an `article`?
- am I editing a full document, or a component/template fragment?
- would this cleanup break a Svelte directive, binding, block, key, or component boundary?
- am I choosing an element because it is accurate, or because it is a rule I memorized?

## Output Guidelines

When writing HTML:

- start with semantic structure first
- keep the markup minimal
- prefer native elements and native behavior
- optimize for readability and maintainability
- remove unnecessary wrappers
- do not add ARIA, classes, or attributes unless they have a clear job
- do not force `ul` / `li`, `section`, or `article` when the semantics are weak
- in Svelte or other template files, preserve directives, block syntax, bindings, and special elements
- prefer accurate structure over mechanical best-practice compliance

## Example Preferences

### Good

- semantic landmarks where they help
- shallow nesting
- explicit labels
- logical headings
- minimal wrappers
- native controls
- `article` for standalone repeated entries
- `ul` / `ol` only for actual lists
- plain containers when semantics are minimal

### Bad

- div soup
- clickable non-interactive elements
- vague structure
- helper text replacing proper semantics
- extra wrappers for no reason
- custom controls when native HTML works
- using list markup for every repeated card
- over-structuring simple layouts
- semantic overfitting
