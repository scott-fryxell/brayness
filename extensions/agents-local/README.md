# agents-local

Loads gitignored personal context and keeps `work/` in sync with
`AGENTS.local.md`.

## Setup

1. Registered in repo `package.json` under `pi.extensions`.
2. Create `AGENTS.local.md` next to `AGENTS.md`.
3. File is gitignored - never committed.

## Behavior

On each session (`resources_discover`):

- Finds `AGENTS.local.md` in cwd ancestors, or at the harness root when cwd
  is inside a nested repo (e.g. `work/realness`).
- Scans `work/` and rewrites the table between `<!-- agents-local:work-sync -->`
  markers in `AGENTS.local.md`.
- Preserves your description text for projects that still exist; adds new rows
  with README/package.json hints; drops removed directories.

On `before_agent_start`, appends the file under `## Personal Context`.

### `/insert`

Splices `AGENTS.local.md` into `README.md` immediately before the last fenced
code block (the `npm start` command). Queues that combined document for the
next prompt only - replaces the default personal-context load for that turn.

Edit descriptions in the synced table freely. Do not hand-maintain the project
list - agents-local owns rows; you own the "What it is" column.
