# API surface

Vue 3 internals used here are undocumented/private but stable across the 3.x line
(verified on 3.5.32). They are not part of Vue's public API — don't ship code that
depends on them, this is for interactive debugging only.

Run everything through `agent-browser eval "(() => { ...code... })()"` — wrap in an
IIFE so the return value serializes cleanly to JSON.

## 1. Finding the app and root instance

```js
const app = document.querySelector('#app').__vue_app__
```

Vue attaches `__vue_app__` to whatever DOM element `app.mount(...)` was called on.
Relevant properties:

| Property | What it is |
|---|---|
| `app.version` | Vue version string, e.g. `"3.5.32"` |
| `app._instance` | Root component instance — starting point for tree walks |
| `app._container` | The mount container (usually same element `__vue_app__` is on) |
| `app.config.globalProperties` | Anything registered via `app.config.globalProperties.x = ...` |

If multiple Vue apps are mounted on one page (micro-frontends, widgets), each mount
root has its own `__vue_app__` — you have to find each container separately.

## 2. Component instance shape

Every component instance (root or descendant) has:

| Property | What it is |
|---|---|
| `instance.type.name` | Component name if set via `defineOptions({ name: ... })` or Options API `name:` |
| `instance.type.__name` | Component name inferred from filename by `<script setup>` SFC compilation (this is usually what you actually get) |
| `instance.type.__file` | Absolute source file path (dev builds only) |
| `instance.subTree` | The rendered vnode tree for this component — walk this to find child components |
| `instance.setupState` | Everything returned from `<script setup>` or `setup()`, **with top-level refs auto-unwrapped** — see gotcha below |
| `instance.props` | Resolved props passed to this component |
| `instance.provides` | Values this instance provides via `provide()` (inherited from ancestors, then extended) |
| `instance.parent` | Parent component instance (walk upward instead of down) |
| `instance.proxy` | The public instance proxy (`$props`, `$emit`, etc. — same shape as Options API `this`) |

## 3. Tree walker — build the whole component tree

```js
const walk = (instance, depth) => {
  if (!instance || depth > 6) return null
  const name = instance.type?.name || instance.type?.__name ||
    (instance.type?.__file ? instance.type.__file.split('/').pop() : 'anonymous')
  const children = []
  const collect = (vnode) => {
    if (!vnode) return
    if (vnode.component) children.push(vnode.component)
    else if (Array.isArray(vnode.children))
      vnode.children.forEach(c =>
        c && c.component ? children.push(c.component)
          : (Array.isArray(c?.children) ? c.children.forEach(collect) : null))
    else if (vnode.children && typeof vnode.children === 'object') collect(vnode.children)
  }
  collect(instance.subTree)
  return { name, children: children.map(c => walk(c, depth + 1)).filter(Boolean) }
}
const app = document.querySelector('#app').__vue_app__
walk(app._instance, 0)
```

Raise `depth > 6` for deeply nested apps; this caps runaway recursion, not tree
correctness. Output is a plain nested `{ name, children }` object — safe to
`JSON.stringify` directly from `eval`.

## 4. Name-finder — locate one component anywhere in the tree

```js
const find = (instance, name, depth) => {
  if (!instance || depth > 8) return null
  const iname = instance.type?.name || instance.type?.__name
  if (iname === name) return instance
  const children = []
  const collect = (vnode) => {
    if (!vnode) return
    if (vnode.component) children.push(vnode.component)
    else if (Array.isArray(vnode.children))
      vnode.children.forEach(c =>
        c && c.component ? children.push(c.component)
          : (Array.isArray(c?.children) ? c.children.forEach(collect) : null))
    else if (vnode.children && typeof vnode.children === 'object') collect(vnode.children)
  }
  collect(instance.subTree)
  for (const c of children) {
    const found = find(c, name, depth + 1)
    if (found) return found
  }
  return null
}
```

Depth-first, returns the *first* match. For `v-for` lists with N instances of the
same component, this only finds one — see
[common-use-cases.md](common-use-cases.md#3-inspecting-one-instance-out-of-a-v-for-list)
for collecting all of them instead.

## 5. State reader — read what's actually in scope

```js
const setup = componentInstance.setupState
Object.keys(setup)          // every name returned from <script setup>
setup.some_ref               // the live value (auto-unwrapped if it was a top-level ref)
componentInstance.props      // resolved props object
```

`setupState` is a reactive Proxy — reading a property here is a real reactive read,
same as templates do. There is no meaningful cost to reading it from `eval`; it
doesn't trigger extra renders on its own.
