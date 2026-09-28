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
├── plans/               every plan, one file each (edit)
│
└── .pi/agent/           PI'S HOME - all agent state in one place
    ├── settings.json    pi config (edit)
    ├── memory.db        session memory index (auto-generated, never synced)
    ├── models.json      model catalog (edit)
    └── npm/             ADD-ON CUPBOARD  (auto-generated - do not edit)
        └── node_modules/  THE ADD-ONS (loop, btw, autoresearch, ...)
```

`memory.db` is a derived FTS5 index over `.pi/agent/sessions/`, built by the
`extensions/memory/` extension so past work can be recalled by relevance
instead of grepped by file. Delete it any time; the `remember` tool rebuilds it
from the transcripts in about a second per four hundred sessions. It holds only
a search index - the transcripts themselves stay in the JSONL files - and it is
never synced.

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
| `extensions/`                            | `.pi/agent/memory.db`     |
| `plans/`                                 | everything else in `.pi/` |
| `.pi/agent/settings.json`                |                           |
| `AGENTS.md`                              |                           |
| `AGENTS.local.md` (personal, gitignored) |                           |

`AGENTS.local.md` is the one file that's purely yours - it holds your preferences and quirks, and stays out of git. It's where the agent picks up on who you are.

## How conversations go

Default to **discussion**: prose, talking it through, no question forms, no jumping to planning.
As we near the planning phase, shift to questions.

**All plans go in `plans/`.** One file per plan, named `<project>-<topic>.md`. Never
inside a `work/<project>/` tree, not even a project's `docs/` - plans are read
across projects and belong at the root with the other one.

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

## Commands

Run npm commands from the repository root.

| Command                                 | Purpose and requirements                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm start` / `npm run brayness`        | Start through `bin/pi`.                                                                                                       |
| `npm run pi:list`                       | List installed pi packages.                                                                                                   |
| `npm run pi:update`                     | Delete the shared `~/.npm/_npx` cache, then update pi packages. Other npx tools will download again.                          |
| `npm test`                              | Run the memory index tests.                                                                                                   |
| `npm run make:animation -- clip.mov`    | Run `bin/make-animation.js`; requirements below.                                                                              |
| `npm run feeds`                         | Rebuild personal vault feeds; requires the local vault setup.                                                                 |
| `npm run plans` / `npm run plans:build` | Workspace-only: need `work/blog` dependencies and `work/brayness/examples/plan-viewer`. These paths are not in this checkout. |

### Video to traced animation

Install FFmpeg and a Chromium browser (Chrome, Brave, Chromium, or Edge).
On macOS, install FFmpeg with `brew install ffmpeg`.
The script uses `https://realness.online/poster-driver`, so rendering needs
network access and that page must be available.

```bash
npm run make:animation -- clip.mov --fps 12 --workers 2
```

Output goes to `artifacts/animation/`. Traced SVG files remain for reuse.

| Option          | Default     | Effect                                                 |
| --------------- | ----------- | ------------------------------------------------------ |
| `--fps N`       | 24          | Frames per second.                                     |
| `--workers N`   | 6           | Parallel browser workers; reduce for lower memory use. |
| `--width N`     | Source size | Raster output width.                                   |
| `--crf N`       | 23          | Video compression, 0-51; higher makes smaller files.   |
| `--keep-frames` | Off         | Keep raster frames after encoding.                     |

Set `CHROME_PATH` to a browser executable if detection fails.
Set `REALNESS_URL` to use a different Realness deployment.
This command traces video frames; it does not generate artwork.

### Web media copies

`bin/for-web.sh` uses macOS file-size commands. Images require ImageMagick;
videos require FFmpeg (`brew install imagemagick ffmpeg`).

```bash
./bin/for-web.sh photo.jpg clip.mov
```

It writes `-web.jpg`, `-web.webp`, and `-web.mp4` beside the source files.
Originals stay unchanged. Existing output copies can be overwritten.
Without arguments, it processes supported files in the current directory.

## Scratch space

Everything the agent writes stays inside brayness - never `/tmp`, never outside the harness.
Scratch and one-off experiment files go in `artifacts/<project>/` at the harness root.
Use it, then leave it - Scott deletes it himself so he can check the work first.

## More

- Agent instructions: `AGENTS.md`
- Setup: install Node >= 22.19, then run `npm start` from this checkout.
