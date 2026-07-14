# Sources

## Primary source: live-tested session

**Trust tier:** canonical (first-hand, executed and verified in this repo)
**Confidence:** high — every snippet in `references/api-surface.md` was run via
`agent-browser eval` against the real `work/realness` Vue 3.5.32 dev app
(`https://localhost:*/colors`) and the returned output is recorded verbatim in the
originating conversation.
**Contribution:** all of `SKILL.md`, `references/api-surface.md` (sections 1–5),
`references/common-use-cases.md` (use case 1, which reproduces the exact tested
snippet and output).
**Usage constraints:** none — this is our own tested behavior, not third-party
documentation subject to license/attribution requirements.

What was actually verified live, in order:

1. `document.querySelector('#app').__vue_app__` exists and has keys `_uid`,
   `_component`, `_props`, `_container`, `_context`, `_instance`, `version`, `config`,
   `use`, `mixin`, `component`, `directive`, `mount`, `onUnmount`, `unmount`,
   `provide`, `runWithContext`. `version` read as `"3.5.32"`.
2. The tree walker produced a real, correctly-nested tree for `/colors`:
   `App → working-border / support-layout → site-nav → LogoAsLink → RouterLink → icon`
   and `RouterView → Colors → icon×6, preview-mark×N → icon`.
3. The name-finder located the `Colors` component instance by name.
4. `colors.setupState` returned every binding actually declared in
   `work/realness/src/views/Colors.vue`'s `<script setup>` (`icon_index`,
   `preview_icon`, `cycle_icon`, `weights`, `roles_weights_open`, `resolved`,
   `wiring`, `variant_of`, etc. — full list matches the file).
5. The ref-unwrapping gotcha was hit directly: `setup.icon_index?.value` returned
   `undefined`; `setup.icon_index` returned `0` (correct). Same for
   `roles_weights_open` (`false`). This is recorded as issue #1 in
   `references/troubleshooting-workarounds.md`.

## Secondary source: general Vue 3 reactivity-system knowledge

**Trust tier:** secondary (model background knowledge, not independently re-verified
in this session)
**Confidence:** medium-high — consistent with Vue 3's public architecture
(`ComponentInternalInstance` shape, `subTree`/vnode structure, `Teleport`/`Suspense`/
`KeepAlive` semantics) but not executed against a live app in this session.
**Contribution:** `references/api-surface.md` section on `instance.provides`/
`instance.parent`/`instance.proxy`; `references/common-use-cases.md` use cases 3–8;
`references/troubleshooting-workarounds.md` issues 2–10 (functional components,
Teleport, Suspense/KeepAlive, production name mangling, multiple apps, Vue 2
differences, JSON serialization of function/circular values).
**Usage constraints:** flagged in-line as unverified-this-session; re-verify against
a real app before relying on the Teleport/Suspense/KeepAlive specifics (issues 5–6)
if they matter for a specific debugging task — those are the least commonly exercised
paths and the most likely to have drifted across Vue 3 minor versions.

## Gaps / not yet verified

- Vue 2 comparison table (issue #9) is from general knowledge, not tested against an
  actual Vue 2 app — if this skill gets used on a Vue 2 codebase, verify the
  `__vue__`/`$children`/`$options.name` paths for real before trusting them.
- No verification of behavior inside a Vite build in `--mode production` (issue #7's
  name-mangling claim is plausible but untested here).
- No coverage of Nuxt-specific wrapping (Nuxt's app root/hydration layer may add a
  level of indirection above plain `__vue_app__`).

Retrieval stopped here because the primary source (live execution) fully covers the
core workflow this skill exists for, and the secondary-knowledge gaps are edge cases
explicitly flagged rather than silently assumed.
