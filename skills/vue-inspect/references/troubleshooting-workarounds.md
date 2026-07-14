# Troubleshooting / workarounds

## 1. Top-level refs are auto-unwrapped in `setupState`

**Symptom:** `setup.some_ref.value` returns `undefined`, even though the ref
definitely holds a value and the component renders correctly.

**Cause:** Vue auto-unwraps top-level refs in the `setupState` proxy so templates can
write `{{ some_ref }}` instead of `{{ some_ref.value }}`. The unwrapping happens for
*any* binding returned directly from `<script setup>` or `setup()`'s return object —
not just the ones the template happens to use.

**Fix:** Read the property directly, no `.value`:

```js
setup.icon_index          // 0  — correct
setup.icon_index?.value   // undefined — wrong, this is what bit us
```

Check `typeof setup.some_binding` first if you're not sure whether something is a
plain value, a function, or (rarely) a non-unwrapped nested ref.

## 2. Nested refs inside a returned object keep `.value`

**Symptom:** Inconsistent — some properties need `.value`, some don't, on the same
component.

**Cause:** Auto-unwrapping is shallow and only applies to the top level of what
`setup()` returns. `const state = reactive({ count: ref(0) })` unwraps automatically
(reactive() unwraps refs), but `const state = { count: ref(0) }` (plain object, not
`reactive()`) does **not** — `setup.state.count.value` is required there.

**Fix:** Don't assume a pattern; check the actual shape:

```js
typeof setup.state          // 'object'
typeof setup.state.count    // 'object' means it's still a ref — use .value
```

## 3. `find()` returns the first match only — repeated components (`v-for`) get lost

**Symptom:** Looking for one instance of a component that's rendered many times
(e.g. six icon swatches) only ever returns the first one, and its state doesn't
match the instance you actually care about.

**Fix:** Use `findAll` (collect instead of early-return) — see
[common-use-cases.md #3](common-use-cases.md#3-inspecting-one-instance-out-of-a-v-for-list).
Disambiguate by `props` (each `v-for` instance usually has a distinguishing prop like
`key` or an index) rather than by name alone.

## 4. Functional components have no instance to walk into

**Symptom:** The tree walker silently skips a component you know is in the template.

**Cause:** Functional components (`(props) => h(...)`, or SFCs marked
`functional: true` in Options API — rare in Vue 3) don't get a full component
instance; their vnode has no `.component`, so `collect()` never pushes them and their
children get attributed to the parent instead.

**Fix:** There's no instance to inspect for a functional component itself — walk past
it to its rendered children by inspecting the vnode's own `.children` instead of
expecting a `.component`. Usually not worth chasing; check if the *parent's*
`setupState` already has what you need.

## 5. `Teleport` content isn't where you'd expect in the tree

**Symptom:** A component you know is rendered (e.g. a modal, a toast) doesn't show
up under its logical parent in the walked tree.

**Cause:** `<Teleport to="body">` moves the actual DOM output elsewhere, but more
relevantly here, the vnode subtree structure for teleported content can require
checking `vnode.type === Teleport` and reading `vnode.children` directly rather than
assuming normal parent/child component nesting.

**Fix:** If a component is missing from the walk, check whether it or an ancestor
uses `<Teleport>`. Search from the root with a *wider* depth cap, or find it by
walking `document.body`'s DOM directly and reading `el.__vueParentComponent` (see
issue 8) instead of the vnode tree.

## 6. `Suspense` and `KeepAlive` boundaries change the subtree shape

**Symptom:** Children inside `<Suspense>` or `<KeepAlive>` are missing or duplicated
when walking `subTree`.

**Cause:** `Suspense` vnodes carry content in `.ssContent`/`.ssFallback` rather than
plain `.children`. `KeepAlive` retains cached, currently-inactive instances that
won't appear in the live `subTree` at all (they're cached, not rendered).

**Fix:** For Suspense-heavy trees, check `vnode.ssContent` explicitly in the
collector. For KeepAlive, understand that an "inspectable" instance only exists while
that branch is the active one — you can't introspect a cached-but-inactive instance
this way.

## 7. Component names are missing or mangled in production builds

**Symptom:** `instance.type.name` and `instance.type.__name` are both `undefined`,
or resolve to minified identifiers like `_sfc_main` / single letters.

**Cause:** `<script setup>`'s automatic `__name` inference from filename is a dev
convenience; production builds (or builds without dev-mode SFC compilation) may strip
it. Minifiers can also rename the underlying variable.

**Fix:** Fall back to `instance.type.__file` (only in dev builds, also stripped in
prod) or match structurally (DOM position, class names, prop shape) instead of by
name when working against a production build. Prefer testing this against a dev
server, not a minified build, whenever possible.

## 8. Multiple Vue apps on one page each have their own `__vue_app__`

**Symptom:** `document.querySelector('#app').__vue_app__` is `undefined`, or only
shows part of the page you expected.

**Cause:** Widgets, micro-frontends, or multiple `createApp().mount(...)` calls each
own a separate app instance rooted at a different DOM element. `#app` might not be
the actual mount point, or might be only one of several.

**Fix:** Search more broadly for the mount root:

```js
[...document.querySelectorAll('*')].find(el => el.__vue_app__)
```

or check the specific container you expect (`document.querySelector('[data-app-root]')`,
whatever selector matches your actual mount call).

## 9. This does not work on Vue 2

**Symptom:** `el.__vue_app__` is `undefined`, `instance.setupState` is `undefined`,
nothing here returns useful data.

**Cause:** Vue 2's internals are structurally different — there is no Composition API
instance shape by default (Vue 2.7 added `setup()` support but the underlying
instance still isn't `ComponentInternalInstance`-shaped). Vue 2 uses:

| Vue 3 (this skill) | Vue 2 equivalent |
|---|---|
| `el.__vue_app__` | `el.__vue__` (points directly at the component instance, not an app wrapper) |
| `instance.setupState` | `instance._data` (Options API `data()`), `instance._computedWatchers` |
| `instance.subTree` | no direct equivalent; use `instance.$children` |
| `instance.type.name`/`__name` | `instance.$options.name` |
| `instance.props` | `instance.$props` |

**Fix:** Confirm the version first (`el.__vue__ ? '2.x' : (el.__vue_app__ ? '3.x' : 'not vue')`)
before applying any snippet from this skill. Don't port the tree walker as-is — Vue 2
needs `$children` traversal, not vnode/subTree walking.

## 10. Reading `eval` output silently truncates functions and circular refs

**Symptom:** `JSON.stringify`-based `eval` output for `setupState` drops function
values and can throw on circular structures (e.g. a `ref` that points back to a
component instance, or a Vue Router route object).

**Fix:** Don't return the raw `setupState` object from `eval` — pick specific
primitive fields:

```js
// bad: agent-browser eval "(() => setup)()"  — likely truncated/circular
// good:
agent-browser eval "(() => ({ icon_index: setup.icon_index, preview_icon: setup.preview_icon }))()"
```
