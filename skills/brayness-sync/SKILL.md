---
name: brayness-sync
description: Sync changes from dev brayness/ to the published work/brayness/ git mirror. Copies skills, extensions, bin, agent docs, and selected .pi/agent config while excluding secrets, sessions, nested .git dirs, and node_modules. Validates the copy, shows git diffs, and proposes commits. Use for "sync brayness", "prepare release", or after major skill/extension changes.
---

# Brayness Sync

One-way copy: dev root -> `work/brayness/` (the git-tracked mirror for
releases). Dev has working chaos (nested repos, secrets, sessions); the
mirror stays clean and publishable. Every sync is reviewed - no blind sync.

## Copy list (source of truth)

| Path                                                  | Why                                         |
| ----------------------------------------------------- | ------------------------------------------- |
| `skills/`                                             | skill catalog                               |
| `extensions/`                                         | extensions                                  |
| `bin/pi`                                              | CLI wrapper                                 |
| `package.json`                                        | app dependency + scripts                    |
| `AGENTS.md`, `CLAUDE.md`, `README.md`                 | agent docs                                  |
| `.gitignore`, `.ignore`, `.nvmrc`                     | repo config                                 |
| `.pi/agent/settings.json`, `.pi/agent/models.json`    | pi config                                   |
| `.pi/agent/npm/README.md`, `.pi/agent/npm/.gitignore` | add-on signposts                            |
| `.pi/agent/subagents.json`                            | subagent config (defaults, tools, profiles) |
| `.pi/agent/extensions`                                | symlink                                     |
| `.cursor/skills`, `.claude/skills`                    | repo-root symlinks (Cursor/Claude Code)     |

Never copy: `.pi/agent/` anything else (auth, trust, caches, models-store,
sessions, npm/node_modules), `.env*`, nested `.git/`, `node_modules/`,
`AGENTS.local.md`, `plans/`, `work/` projects.

Sessions rule: transcripts may contain secrets or personal info. They stay
in dev, always.

## Workflow

1. **Detect** - diff dev against the mirror for the copy-list paths;
   summarize what changed.
2. **Plan** - show what will be copied and excluded; get approval.
3. **Copy** - commands in `references/workflow.md`.
4. **Validate** - checks in `references/validation.md` (no nested `.git`,
   no `.env`, no `node_modules`, structure intact). Stop on any failure.
5. **Review** - `git diff` in the mirror; walk the user through it.
6. **Commit** - propose a message; commit only after approval.

Worked examples: `references/examples.md`.

## One-time migration note

The mirror may still have the pre-2026-08-06 layout (root `settings.json`,
`models.json`, `sessions/`, `npm/`). First sync after the `.pi/agent/` move:
`git mv` those into `.pi/agent/` in the mirror (or delete root `sessions/` -
it should never have shipped), then run the normal sync. Show the user this
migration as its own diff before anything else.
