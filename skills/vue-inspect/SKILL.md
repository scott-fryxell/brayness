---
name: vue-inspect
description: Inspect live Vue 3 component state via agent-browser eval - no Devtools extension, no console.log. Triggers - "inspect this Vue component", "what's the current value of this ref", "read setupState", "walk the Vue tree", "Vue devtools alternative". Vue 3 Composition API only.
---

# vue-inspect

Vue 3 exposes its whole runtime state on plain DOM nodes and component instances - no
extension required. This skill is a set of copy-pasteable `eval` snippets (run via
`agent-browser eval "(() => { ... })()"`) that walk that internal state to answer
"what does this component actually think its data is right now."

It exists because `agent-browser` has native React Devtools integration
(`--enable react-devtools` + `react tree`/`react inspect`/`react renders`) but nothing
built in for Vue. These snippets close that gap using Vue 3's own internals directly.

## When to use

- Runtime-dependent state: what a ref/prop/computed actually is right now
  (mid-animation, post-interaction), what's actually mounted, whether a
  component exists in the rendered tree at all.
- Not for static reads - prop definitions and template markup live in the
  source file; go read it instead.

## Quick start

Confirm the page is a Vue 3 app and get the version:

```bash
agent-browser eval "document.querySelector('#app').__vue_app__.version"
```

If `#app` isn't the mount point, find it: Vue attaches `__vue_app__` to whatever
element was passed to `app.mount(...)`. `document.querySelector('[data-v-app]')` or
inspecting the root of the visible DOM tree usually finds it if the id differs.

Full reference snippets (tree walker, name-finder, state reader) live in
[references/api-surface.md](references/api-surface.md) - copy them directly into an
`eval` call.

## The one gotcha that will cost you time

`setupState` **auto-unwraps top-level refs**. `setup.some_ref` is the raw value
(`0`, `false`, `{...}`), not a ref object - `setup.some_ref?.value` silently returns
`undefined`. Check `typeof setup.some_ref` before assuming you need `.value`. Full
explanation in [references/troubleshooting-workarounds.md](references/troubleshooting-workarounds.md#1-top-level-refs-are-auto-unwrapped-in-setupstate).

## Files

- [references/api-surface.md](references/api-surface.md) - the internal properties
  (`__vue_app__`, `subTree`, `setupState`, `type.name`) and the three core snippets
  (tree walker, name-finder, state reader).
- [references/common-use-cases.md](references/common-use-cases.md) - worked examples:
  reading a ref, finding a `v-for` instance, checking props, confirming mount/unmount,
  reading provide/inject, catching a mid-animation state.
- [references/troubleshooting-workarounds.md](references/troubleshooting-workarounds.md) - 
  known failure modes (ref unwrapping, functional components, Teleport/Suspense/KeepAlive,
  multiple apps, Vue 2 differences, prod build name-mangling) with fixes.

## Pairs with

- **agent-browser** - runs the eval snippets; also has native React Devtools support
  for the equivalent React workflow (`react tree`, `react inspect <id>`).
