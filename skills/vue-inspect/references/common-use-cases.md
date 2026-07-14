# Common use cases

Worked examples. All run via `agent-browser eval "(() => { ... })()"` against a page
already open with `agent-browser open <url>`.

## 1. Reading a single ref/computed value by name

Verified live in `work/realness` `/colors` against `Colors.vue`:

```js
(() => {
  const find = (instance, name, depth) => {
    if (!instance || depth > 8) return null
    const iname = instance.type?.name || instance.type?.__name
    if (iname === name) return instance
    const children = []
    const collect = (vnode) => {
      if (!vnode) return
      if (vnode.component) children.push(vnode.component)
      else if (Array.isArray(vnode.children))
        vnode.children.forEach(c => c && c.component ? children.push(c.component)
          : (Array.isArray(c?.children) ? c.children.forEach(collect) : null))
      else if (vnode.children && typeof vnode.children === 'object') collect(vnode.children)
    }
    collect(instance.subTree)
    for (const c of children) { const found = find(c, name, depth + 1); if (found) return found }
    return null
  }
  const app = document.querySelector('#app').__vue_app__
  const colors = find(app._instance, 'Colors', 0)
  return { icon_index: colors.setupState.icon_index, roles_weights_open: colors.setupState.roles_weights_open }
})()
```

Returned `{ icon_index: 0, roles_weights_open: false }` — the actual live values,
confirmed against the component's real `ref(0)`/`ref(false)` declarations.

## 2. Getting the whole component tree for a page

Use the tree walker from [api-surface.md](api-surface.md#3-tree-walker--build-the-whole-component-tree)
when you don't know the structure and don't want to guess it from source. On
`/colors` this produced:

```
App
├── working-border
└── support-layout
    ├── site-nav
    │   └── LogoAsLink → RouterLink → icon
    └── RouterView
        └── Colors
            ├── icon ×6
            └── preview-mark ×N → icon
```

Useful for confirming a component is actually mounted where you think it is, or for
finding the exact chain of parent components to walk down from.

## 3. Inspecting one instance out of a `v-for` list

The name-finder returns the *first* match. To get every instance of a repeated
component (e.g. six `<icon>` swatches in a `v-for`), collect all matches instead of
returning early:

```js
const findAll = (instance, name, depth, out = []) => {
  if (!instance || depth > 8) return out
  const iname = instance.type?.name || instance.type?.__name
  if (iname === name) out.push(instance)
  const children = []
  const collect = (vnode) => {
    if (!vnode) return
    if (vnode.component) children.push(vnode.component)
    else if (Array.isArray(vnode.children))
      vnode.children.forEach(c => c && c.component ? children.push(c.component)
        : (Array.isArray(c?.children) ? c.children.forEach(collect) : null))
    else if (vnode.children && typeof vnode.children === 'object') collect(vnode.children)
  }
  collect(instance.subTree)
  children.forEach(c => findAll(c, name, depth + 1, out))
  return out
}
// findAll(app._instance, 'icon', 0).map(i => i.props)
```

## 4. Checking resolved props instead of source defaults

`instance.props` is the *resolved* value after parent bindings, not the prop
definition. Useful when a prop looks wrong and you're not sure if the parent is
passing a bad value or the child is misusing a correct one:

```js
find(app._instance, 'preview-mark', 0).props   // { name: 'star', label: 'water fill' }
```

## 5. Confirming a component actually mounted (or didn't)

If `find(...)` returns `null`, the component isn't in the current render — check a
`v-if` condition, a route mismatch, or a typo in the component name. This is faster
than adding a breakpoint or a mount-lifecycle `console.log`, especially for
conditionally-rendered components that only appear after an interaction:

```js
agent-browser click @e5   // trigger whatever should mount it
agent-browser eval "(() => { /* find(...) */ })()"
```

## 6. Catching state mid-animation or mid-transition

Since `eval` reads the actual live Proxy, not a snapshot taken at page-load, you can
sample state at a specific moment — e.g. mid-CSS-transition, right after a click,
or during a timed `setTimeout`/`requestAnimationFrame` sequence:

```bash
agent-browser click @e2
agent-browser eval "(() => { /* read setupState right after the click triggers */ })()"
```

## 7. Reading provide/inject wiring

`instance.provides` holds everything available to `inject()` at that point in the
tree (inherited from ancestors, extended by this instance). Useful for confirming a
`provide()` call further up the tree actually reached the component that expects it:

```js
Object.keys(find(app._instance, 'Colors', 0).provides)
```

## 8. Checking the Vue version and build mode

```js
document.querySelector('#app').__vue_app__.version
```

Combine with checking `instance.type.__file` presence (only populated in dev builds)
to confirm whether you're looking at a dev or production build — see
[troubleshooting-workarounds.md](troubleshooting-workarounds.md#7-component-names-are-missing-or-mangled-in-production-builds).
