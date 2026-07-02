---
name: test-coverage
description: Write Vitest specs for Vue 3 JavaScript (Vite Plus, happy-dom, @vue/test-utils) and analyze V8 coverage + Fallow health to prioritize test-first refactors. Reference implementation is work/realness. Use when writing or fixing tests, mocking composables, improving coverage, or after test:coverage or npx fallow fails thresholds.
---

# Tests, coverage, and refactor risk

Canonical reference: **`work/realness`** (`@realness.online/web`).

Match `tests/**/*.spec.js` there. Do not introduce Jest, React Testing Library, TypeScript test files, or co-located `*.test.ts`.

Two jobs:

1. **Write specs** — patterns below; detail in [references/web-realness.md](references/web-realness.md)
2. **Prioritize** — `npm run test:risk` before refactors; not a blind chase for 100%

## When to use

- Adding or extending specs for `src/**`
- Mocking `@/use/*`, Firebase, `idb-keyval`, or browser APIs
- Mounting Vue components; fixing failing `vp test`
- User asks what to test, what to refactor, or where risk is highest
- `test:coverage` or coverage thresholds fail CI / pre-commit
- After `npx fallow` reports cycles, complexity, or unused files

## Stack

| Piece | What we use |
| --- | --- |
| Runner | Vite Plus — `vp test`, `import … from 'vite-plus/test'` |
| Engine | Vitest (`vite-plus-test` alias) |
| DOM | `happy-dom` |
| Vue | `@vue/test-utils` — prefer `shallowMount` |
| Language | JavaScript + JSDoc |
| Coverage | V8, 80% global, `all: true` |

## Commands

```bash
vp test run --reporter=dot          # npm run test
vp test watch                       # npm run test:watch
vp test run --coverage              # npm run test:coverage
vp test run --bail=1 --reporter=dot # npm run test:fail-fast
npm run test:risk                   # coverage + fallow + risk report
```

Pre-commit: `vp check --fix && vp run type && vp test run`.

## Writing specs

### Layout

- All specs in `tests/**/*.spec.js` mirroring `src/` (not co-located)
- `describe('@/utils/itemid', …)` or view/component name
- `@/` → `src/`; `@@/` → `tests/mocks/`
- Config: `vite.config.js` → `test` block; setup: `tests/setup.js`, `tests/mocks/`

### Skeleton

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

`snake_case`, no semicolons, test behavior not internals.

### Key patterns

| Pattern | Approach | Reference spec |
| --- | --- | --- |
| Pure utils | Input/output, nested `describe` | `tests/utils/itemid.spec.js` |
| Module mocks | Top-level `vi.mock()`; `vi.clearAllMocks()` in `beforeEach` | `tests/utils/itemid.spec.js` |
| Vue components | `shallowMount`, stubs, semantic queries | `tests/components/account/as-notifications.spec.js` |
| Composable mocks | `vi.hoisted()` refs for `vi.mock` closures | `tests/views/Account.spec.js` |
| Composables | `with_setup()` + `mount(defineComponent(...))` | `tests/use/poster.spec.js` |
| Async errors | `await expect(…).rejects.toThrow()` | `tests/utils/itemid.spec.js` |

**Hoisted mocks** (reset `.value` in `beforeEach`):

```javascript
const { mock_status, mock_enable } = vi.hoisted(() => {
  const create_ref = value => ({ value, __v_isRef: true })
  return {
    mock_status: create_ref('off'),
    mock_enable: vi.fn().mockResolvedValue(true)
  }
})

vi.mock('@/use/push', () => ({
  use_push: () => ({ status: mock_status, enable: mock_enable })
}))
```

Global mocks: `tests/mocks/default.js`, `tests/mocks/browser/*`. Per-spec mocks only when behavior differs.

`mockReset: false` in config — mocks keep implementations; clear call history each test.

### What we do not do

| Avoid | Use instead |
| --- | --- |
| Jest / React Testing Library | `vite-plus/test` + `@vue/test-utils` |
| TypeScript test files | `.spec.js` + JSDoc |
| `@faker-js/faker` | Domain fixtures (item IDs, directories) |
| supertest / live DB | Mock `idb-keyval`, `serverless` |
| `data-testid` | Semantic DOM queries |
| 100% coverage | 80% gate + risk report |

Full patterns, templates, file map: [references/web-realness.md](references/web-realness.md)

## Coverage workflow

### 1. Risk report (start here)

```bash
npm run test:risk
# or, if reports already exist:
npm run test:risk:report
```

Runs `scripts/prioritize-refactor-risk.js`.

- **Delete or wire** — fallow `unused-files`; do not add tests
- **Test before refactor** — ranked by coverage gap + CRAP + fan-in + hotspots + P0/P1

Options: `--threshold 80 --top 25 --root .`

### 2. Coverage-only table

```bash
node skills/test-coverage/scripts/summarize-coverage.js --root .
```

### 3. HTML + line detail

Open `coverage/index.html` for uncovered lines.

### 4. Fallow detail

```bash
npx fallow health --targets
npx fallow health --hotspots
npx fallow --format json
```

### 5. Classify each item

| Verdict | Meaning |
| --- | --- |
| **test-first** | Add/extend specs before refactor |
| **refactor-with-tests** | Some coverage; shore up hot paths then refactor |
| **delete-or-wire** | Fallow unused file — entry point or delete |
| **defer** | Low product risk |

Priority: **P0** IDs/auth/sync/payments, **P1** posters/potrace/3D, **P2** rest.

### 6. Implement tests

Only when the user asks. Re-run `npm run test:risk` after changes.

### 7. Evolving Fallow config

When behavior changes, update `.fallowrc.json`, [references/fallow-integration.md](references/fallow-integration.md), and this file if needed.

## Output format (risk reports)

```markdown
# Refactor risk (coverage + fallow)

## Delete or wire
- …

## Test before refactor
| file | pri | cov% | risk | … |

## Workflow
```

## Judgment principles

- Unused in fallow graph → **delete or wire**, not test
- High complexity + low coverage + high fan-in → **test-first**
- Cycles (`itemid` ↔ `serverless`, `Directory`) → characterize with tests, then break
- Nuclear triad: typecheck + lint + tests; coverage supports refactors
- Match existing spec style; extend specs over new files
- Excluded from coverage: `src/main.js`, `src/router.js`, `src/wasm/**`

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/summarize-coverage.js` | Coverage table |
| `scripts/prioritize-refactor-risk.js` | Coverage + fallow merge |
| `scripts/lib/coverage-metrics.js` | Shared Istanbul parsing |

## References

- [web-realness.md](references/web-realness.md) — stack, patterns, file map, judgment
- [fallow-integration.md](references/fallow-integration.md) — `.fallowrc.json`
- Vitest: https://vitest.dev/
- Vue Test Utils: https://test-utils.vuejs.org/
