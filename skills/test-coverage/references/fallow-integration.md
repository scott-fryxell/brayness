# Fallow + test-coverage skill

Use with `@realness.online/web` (`work/web`) or any project that has Vitest coverage and `.fallowrc.json`.

## Commands (web `package.json`)

| Script | What it does |
| --- | --- |
| `npm run test:coverage` | Vitest + `coverage/coverage-final.json` (`dot` reporter - quiet per-test noise) |
| `npm run fallow` | `npx fallow` - human-readable terminal output |
| `npm run fallow:report` | writes `fallow-report.json` for the risk script |
| `npm run test:risk` | coverage -> `fallow:report` -> risk report |
| `npm run test:risk:report` | risk report only (existing JSON artifacts) |

## Agent workflow

1. `npm run test:risk` (or coverage + fallow + summarize script separately)
2. Read **Delete or wire** - never recommend tests for fallow `unused-files`
3. Read **Test before refactor** - ranked table; open `coverage/index.html` for lines
4. Apply [web-realness.md](web-realness.md) P0/P1 labels on top
5. After refactors, re-run so CRAP / istanbul match count stays high

## Scripts

| Script | Output |
| --- | --- |
| `scripts/summarize-coverage.js` | coverage-only table |
| `scripts/prioritize-refactor-risk.js` | coverage + fallow merged |

Both accept `--root <project>`.

## Evolving `.fallowrc.json`

**Source of truth:** `work/web/.fallowrc.json` (Fallow schema - no custom keys; document changes here instead).

**Skill-owned docs (update when config changes):** this file + `SKILL.md` workflow section.

When the skill gains new behavior, update the matching config block here and in the repo:

### `entry`

Manual entry points fallow cannot infer. Web project:

```json
"entry": ["src/workers/*.js", "scripts/*.js"]
```

Add globs when new runtime islands appear (e.g. a new worker dir).

### `ignorePatterns`

Paths excluded from all analyses. Keep aligned with `vite` coverage excludes where possible.

### `health`

Complexity thresholds and ignores for `fallow health` / CRAP:

```json
"health": {
  "ignore": ["**/tests/**", "**/src/wasm/**"],
  "maxCyclomatic": 20,
  "maxCognitive": 15
}
```

- Tighten thresholds when the team wants stricter refactor gates
- Add `ignore` globs for generated or vendor-adjacent dirs

Fallow reads Istanbul output from `coverage/coverage-final.json` after `npm run test:coverage`. Low CRAP match counts mean stale or missing coverage - not a separate config path.

### `rules`

Dead-code severities. Web defaults: `unused-files` / `unused-exports` as `warn` for incremental adoption.

### `duplicates`

Clone detection for refactor opportunities in tests and `src/`. Web uses `mode: mild`, `minLines: 8`.

### `overrides`

Per-path rule tweaks (e.g. test mocks, `unresolved-imports` off for icon paths).

### Changelog (skill <-> config)

| Date | Change |
| --- | --- |
| 2026-05-18 | Initial integration: `test:risk` scripts, `prioritize-refactor-risk.js`, explicit `health` block |

Add a row when you change `.fallowrc.json` for this skill.

## Judgment (test vs delete vs refactor)

| Signal | Action |
| --- | --- |
| fallow `unused-files` | Delete, wire an entry point, or `fallow-ignore-file` - not tests |
| High risk score + low coverage + used in graph | **Test-first**, then refactor |
| fallow `extract_complex_functions` / cycles | Tests around public API, then structural refactor |
| Good coverage + high complexity | Refactor with regression tests |
| P0 path in [web-realness.md](web-realness.md) | Bump priority even if score is lower |

## Related

- [Fallow health explained](https://docs.fallow.tools/explanations/health)
- [Fallow dead code explained](https://docs.fallow.tools/explanations/dead-code)
