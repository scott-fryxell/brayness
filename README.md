# Brain

Personal workspace for [pi](https://github.com/earendil-works/pi-coding-agent): skills, extensions, and agent config.

## Start pi

```bash
npm install    # installs the app (first time only)
npm start      # runs pi
```

Requires Node >= 22.19.

## Where things live

Most folders here are things you edit. Two folders are auto-generated - ignore them.

```
brain/
├── skills/              your skills (edit)
├── extensions/          your extensions (edit)
├── settings.json        pi config (edit)
│
├── node_modules/        THE APP  (auto-generated - do not edit)
└── npm/                 ADD-ON STORAGE  (auto-generated - do not edit)
    └── node_modules/    THE ADD-ONS
```

### The app

`node_modules/` at the repo root holds **pi itself**.

Update it: `npm install` (from the repo root)

### The add-ons

`npm/node_modules/` holds **extra pi packages** listed in `settings.json` (loop, btw, autoresearch, etc.).

Update them: `./bin/pi update --extensions`

### Why is there a folder called `npm/`?

The name is misleading. It is **not** the npm program.

pi always stores downloaded add-ons in a folder called `npm/`. Because this repo *is* pi's home directory, that folder sits at the brain root.

Think of it as **the add-on cupboard**, not "npm".

## What to edit vs ignore

| You edit | Auto-generated (ignore) |
| --- | --- |
| `skills/` | `node_modules/` |
| `extensions/` | `npm/` |
| `settings.json` | `npm/node_modules/` |
| `AGENTS.md` | |
| `AGENTS.local.md` (personal, gitignored) | |

## More

- Agent instructions: `AGENTS.md`
- New machine setup: `docs/local-setup.md`
- Published mirror: `work/brain/`
