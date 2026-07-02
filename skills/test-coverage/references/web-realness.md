# realness — tests + coverage reference

Project: `work/realness` (`@realness.online/web`).

Read the nearest existing spec under `tests/**` before adding a new one.

## Thresholds (vite.config.js)

- Global gate: **80%** lines, branches, statements, functions
- `all: true` — untested `src/**` files count against you
- Excluded: `src/main.js`, `src/router.js`, `src/wasm/**`

## Architecture map (coverage priority)

| Area | Path | Test home | Priority |
| --- | --- | --- | --- |
| Item IDs / sync | `src/utils/itemid.js`, `itemid-parse.js` | `tests/utils/`, `tests/sync-*` | **P0** |
| Auth / me | `src/utils/serverless.js`, `src/persistence/` | `tests/components/`, `tests/use/` | **P0** |
| Sponsorship / Stripe | `src/use/sponsor.js`, `src/components/sponsor/` | `tests/components/sponsor/` | **P0** |
| Posters / SVG | `src/use/poster.js`, `src/components/posters/` | `tests/components/posters/` | **P1** |
| 3D viewer | `src/3d/`, `as-viewer-3d.vue` | `tests/3d/` or component specs | **P1** |
| Potrace | `src/potrace/` | `tests/potrace/` | **P1** |
| Views | `src/views/` | `tests/views/` | **P1** |
| Preferences | `src/utils/preference.js` | extend `tests/App.spec.js` mocks | **P2** |

## Stack

| Piece | What we use |
| --- | --- |
| Runner | Vite Plus — `vp test`, imports from `vite-plus/test` |
| Engine | Vitest (via `vite-plus-test` alias) |
| DOM | `happy-dom` |
| Vue | `@vue/test-utils` — prefer `shallowMount` |
| Language | JavaScript + JSDoc |
| Matchers | `@testing-library/jest-dom` (in setup) |

## Commands

```bash
vp test run --reporter=dot          # npm run test
vp test watch                       # npm run test:watch
vp test run --coverage              # npm run test:coverage
vp test run --bail=1 --reporter=dot # npm run test:fail-fast
npm run test:risk                   # coverage + fallow + risk report
```

Pre-commit: `vp check --fix && vp run type && vp test run`.

## Layout

```
work/realness/
  src/
  tests/
    setup.js
    mocks/default.js
    mocks/browser/          # fetch, localStorage, indexedDB, workers, ...
    utils/itemid.spec.js    # mirrors src/utils/itemid.js
```

Rules:

- `*.spec.js` only — not `.test.ts`, not `__tests__/`, not co-located with `src/`
- Path mirrors `src/` under `tests/`
- `describe('@/utils/itemid', () => { ... })` or view/component name
- `@/` → `src/`; `@@/` → `tests/mocks/`

## vite.config.js test block

```javascript
test: {
  root: '.',
  globals: true,
  environment: 'happy-dom',
  include: ['tests/**/*.spec.js'],
  exclude: [
    ...configDefaults.exclude,
    '**/setup.js',
    '**/mocks/**',
    '**/workers/tracer.spec.js'
  ],
  testTimeout: 30000,
  mockReset: false,
  setupFiles: [
    './tests/setup.js',
    './tests/mocks/default.js',
    './tests/mocks/browser/console.js'
    // fetch, worker, indexedDB, localStorage, ...
  ],
  coverage: {
    include: ['src/**/*.js', 'src/**/*.vue'],
    lines: 80, branches: 80, statements: 80, functions: 80,
    all: true,
    provider: 'v8',
    exclude: ['tests/**', 'src/main.js', 'src/router.js', 'src/wasm/**']
  }
}
```

Global helpers from `tests/setup.js`: `resolve_mock_path`, `read_mock_file`.

## tests/setup.js

- `@testing-library/jest-dom`
- VTU: stubs `router-link` / `router-view`, `set_working`, fake `$router` / `$route`
- `matchMedia`, `IntersectionObserver`, `ResizeObserver`
- Imports browser mocks

## tests/mocks/default.js

Mocks: `vue-router`, Firebase, `idb-keyval`, heavy async SFCs (`as-dialog-preferences`, `as-dialog-documentation`).

Do not mock `as-fps` globally — `tests/components/fps.spec.js` mounts the real component.

## Spec file map

| src area | tests home | Example |
| --- | --- | --- |
| `src/utils/` | `tests/utils/` | `itemid.spec.js` |
| `src/use/` | `tests/use/` | `poster.spec.js` |
| `src/components/` | `tests/components/` | `account/as-notifications.spec.js` |
| `src/views/` | `tests/views/` | `Account.spec.js` |
| `src/persistence/` | `tests/persistence/` | `Directory.spec.js` |
| `src/3d/` | `tests/3d/` | `scenes/create-poster-scene.spec.js` |
| `src/workers/` | `tests/workers/` | `vector.spec.js` |
| `src/potrace/` | `tests/potrace/` | `index.spec.js` |
| App shell | `tests/` | `App.spec.js` |

## Patterns

### Spec skeleton

```javascript
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { fn_under_test } from '@/utils/example'

describe('@/utils/example', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('describes behavior in plain language', () => {
    expect(fn_under_test('input')).toBe('output')
  })
})
```

Conventions: `snake_case`, no semicolons, test behavior not internals, let errors surface.

### Module mocks

```javascript
vi.mock('idb-keyval')
vi.mock('@/utils/serverless', () => ({
  url: vi.fn().mockResolvedValue('https://example.com/file.html.gz'),
  me: { value: undefined }
}))
```

`mockReset: false` — clear call history in `beforeEach`, not implementations.

### vi.hoisted (components + composables)

```javascript
const { mock_me, mock_replace } = vi.hoisted(() => {
  const create_ref = value => ({ value, __v_isRef: true })
  return {
    mock_me: create_ref(undefined),
    mock_replace: vi.fn()
  }
})

vi.mock('@/utils/serverless', () => ({ me: mock_me }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mock_replace })
}))
```

Reset ref `.value` in `beforeEach`.

### Vue components

`shallowMount`, stub children, semantic DOM queries (not `data-testid`).

```javascript
const mount = () =>
  shallowMount(MyView, { global: { stubs: { icon: true } } })
```

`flushPromises()` after async emits. **Refs:** `as-notifications.spec.js`, `Account.spec.js`.

### Composables (`@/use/*`)

```javascript
function with_setup(composable) {
  let result
  mount(
    defineComponent({
      setup() {
        result = composable()
        return () => {}
      }
    })
  )
  return result
}
```

**Ref:** `poster.spec.js`. Pure exported helpers — call directly.

### Async / errors

```javascript
await expect(load(id, id)).rejects.toThrow('Network failure')
url.mockRejectedValue(
  Object.assign(new Error('unauthorized'), { code: 'storage/unauthorized' })
)
```

### Browser / persistence

- `localStorage` — `tests/mocks/browser/localStorage.js`; `localStorage.me = id`
- `idb-keyval` — `get.mockImplementation(...)`
- `fetch` — per-test or `tests/mocks/browser/fetch.js`

### Workers / 3D

- Worker exclusions in `vite.config.js` `test.exclude`
- 3D: scene factories and settings under `tests/3d/` — not every render branch

## itemid fixtures

Reuse from `tests/utils/itemid.spec.js`:

```javascript
const directory = {
  id: '/+16282281824/posters/index/',
  types: [],
  archive: [1575821772081],
  items: ['1720119797893']
}
```

Person prop: `{ id, name, type: 'person' }`.

## Judgment

**Add tests when**

- User-visible branches (routing, auth, payments, poster export)
- P0/P1 file with no spec yet
- Async, parsing, ID transforms, filesystem sync

**Defer when**

- Glue to APIs mocked in `tests/mocks/browser/`
- Template-only UI covered by parent spec
- Visual 3D scene graphs

**Do not chase**

- `src/main.js`, `src/router.js`, `src/wasm/**`
- Generated or vendor-adjacent code
- Fallow `unused-files` — delete or wire, not test

## What we do not do

| Avoid | Use instead |
| --- | --- |
| Jest | `vite-plus/test` + `vp test` |
| TypeScript test files | `.spec.js` + JSDoc |
| Co-located `src/foo.test.ts` | `tests/foo.spec.js` |
| React Testing Library | `@vue/test-utils` |
| `@faker-js/faker` | Domain fixtures (item IDs, directories) |
| supertest / live DB | Mock `idb-keyval`, `serverless` |
| Snapshot-heavy UI | DOM text, attributes, mock calls |
| 100% coverage | 80% gate + risk report |

## Fallow

- `npm run test:risk` — coverage + fallow + merged report
- `.fallowrc.json` — [fallow-integration.md](fallow-integration.md)

## Docs before recommending work

- `work/realness/AGENTS.md` — vp test, check commands
- Nearest `tests/**` mirror for the uncovered file
