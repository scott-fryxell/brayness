# Brayness

_A harness for your anxious digital brain._

A personal workspace for [pi](https://github.com/earendil-works/pi-coding-agent): skills, extensions, and agent config.

This is a **starter**. Fork it, then make it yours. Every skill and extension you find here is yours to keep or rewrite - none of it is sacred. The pieces are a first pass for you to reshape as you work.

## Where things live

Two folders are auto-generated - everything else is yours to edit.

```
brayness/
├── skills/              your skills (edit)
├── extensions/          your extensions (edit)
│
└── .pi/agent/           PI'S HOME - all agent state in one place
    ├── settings.json    pi config (edit)
    ├── models.json      model catalog (edit)
    └── npm/             ADD-ON CUPBOARD  (auto-generated - do not edit)
        └── node_modules/  THE ADD-ONS (loop, btw, autoresearch, ...)
```

`bin/pi` points pi's home at `.pi/agent/` and refuses to run if a stray
`~/.pi` ever appears, so no agent state leaks outside the repo.

`skills/` and `extensions/` are the heart of the harness - they're where you teach the agent to work the way you do. Start with the ones you have, then build more as the need shows up.

`skills/` is the single source of truth. Each harness reads it without a symlink:

- **pi** loads it directly via `--skill "$root/skills"` in `bin/pi`.
- **Cursor** and **Claude Code** read it through the `.cursor/skills` and `.claude/skills` symlinks (both tools have no native way to point at an arbitrary skills folder).

Write a skill once in `skills/`, and it is available in every harness.

### The app

There is **no `node_modules/` to install here.** Pi itself is fetched on demand
by `bin/pi` through [`npx`](https://docs.npmjs.com/cli/v10/commands/npx): the
first run downloads it into the npx cache (`~/.npm/_npx`), later runs are fast
and offline. Nothing is vendored in this repo.

Refresh the cached pi: `npm run pi:update`

### The add-ons

`.pi/agent/npm/node_modules/` holds **extra pi packages** listed in `.pi/agent/settings.json` (loop, btw, autoresearch, etc.).

Update them: `./bin/pi update --extensions`

### Why is there a folder called `npm/`?

The name is misleading. It is **not** the npm program.

pi always stores downloaded add-ons in a folder called `npm/` inside its home directory - here, `.pi/agent/npm/`.

Think of it as **the add-on cupboard**, not "npm".

## What to edit vs ignore

| You edit                                 | Auto-generated (ignore)   |
| ---------------------------------------- | ------------------------- |
| `skills/`                                | `.pi/agent/npm/`          |
| `extensions/`                            | everything else in `.pi/` |
| `.pi/agent/settings.json`                |                           |
| `AGENTS.md`                              |                           |
| `AGENTS.local.md` (personal, gitignored) |                           |

`AGENTS.local.md` is the one file that's purely yours - it holds your preferences and quirks, and stays out of git. It's where the agent picks up on who you are.

## How conversations go

Default to **discussion**: prose, talking it through, no question forms, no jumping to planning.
As we near the planning phase, shift to questions. Plans get written to the `plans/` directory.

## Personal context on demand

`/insert` splices `AGENTS.local.md` into `README.md` right before the last
command block and loads that combined view on your next prompt. Use it when you
want harness docs plus personal context in one shot instead of the default
session load.

## Start pi

```bash
npm start      # fetches pi via npx on the first run, then runs it
```

No install step needed - this repo has no `node_modules/`. Requires Node >= 22.19.

## Scratch space

Everything the agent writes stays inside brayness - never `/tmp`, never outside the harness.
Scratch and one-off experiment files go in the project's gitignored dir under `work/<project>/artifacts/`.
Use it, then leave it - Scott deletes it himself so he can check the work first.

## More

- Agent instructions: `AGENTS.md`
- New machine setup: `docs/local-setup.md`
- Published mirror: `work/brayness/`
