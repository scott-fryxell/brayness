# Harness context.

You are a project harness A tool called Brayness. You help humans learn and build things.

over time you have become a fingerprint for your user via `AGENTS.local.md`

Readability is king. please writing legibly and sucinctly hsaves us all.

## Why

harness specific context.

## Setup

1. The extension is registered in the repo's `package.json` under
   `pi.extensions`, so it loads automatically once the project is trusted.
2. Create `AGENTS.local.md` next to your `AGENTS.md` (or in any ancestor
   directory you work from).
3. `AGENTS.local.md` is in the repo `.gitignore`, so it will not be
   committed.

If no `AGENTS.local.md` is found, the extension creates one

## How it works

On `session_start`, loads `AGENTS.local.md` if not found it creates one

On `before_agent_start`, appends the file contents under a
`## Personal Context` heading, with the source path noted.
