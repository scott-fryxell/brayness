# project-tooling

Gives the agent on-demand awareness of each `work/<project>`'s scripts, ops
helpers, and curated tooling notes - without ballooning the system prompt.

## Why

pi load skills and `AGENTS*.md` into context at startup, but nothing points
the agent at a project's `package.json` scripts, `scripts/`, or `tools/`
helpers. Realness and seeq-app carry a lot of diagnostic and ops tooling that
is easy to miss (logs, emulators, coverage/risk, deploy verify, admin
scripts).

Surfacing all of that in the system prompt bloats context (realness alone has
~55 scripts) and goes stale. Instead, a `project_tooling` tool reads the live
scripts when the agent calls it.

## How it works

- Registers a `project_tooling` tool with a `promptSnippet` (one line in
  `Available tools`) and a `promptGuideline` telling the agent to call it
  before working in a project.
- The tool, when invoked, reads that project's `package.json` scripts (grouped
  by purpose: test/lint/type/build/deploy/logs/dev/other), lists the
  `scripts/` and `tools/` dirs, and includes any curated notes.
- Content is assembled on each call, so changed scripts are picked up
  immediately. No state is kept between sessions.

## Curated notes (optional, recommended)

Drop a `.tooling.md` in a project dir to add human-written notes that lead the
tool's output. Use it to call out the high-value diagnostic commands and their
usage - the stuff `package.json` names alone do not convey.

Example `work/seeq-app/.tooling.md`:

```md
Enterprise SaaS app - Firebase. Heavy diagnostic tooling:

- `npm run logs:errors` - recent prod errors (gcloud)
- `npm run logs:search` - search logs by query
- `npm run test:py` - Python functions tests
- `tools/` has admin scripts (import/export CSVs, reset users).
- Deploys: `npm run deploy`, at least `functions:js`.
```

See `work/realness/.tooling.md` and `work/seeq-app/.tooling.md` for examples.

## Setup

1. Registered via the repo `package.json` `pi.extensions` → `./extensions`, so
   it loads automatically.
2. No other setup. Add `.tooling.md` files as desired.
