---
name: memory
description: "Store and retrieve durable learnings about how brayness actually works - success patterns, failure modes, corrections, and next-time hints. Use before doing a task similar to a past one (check AGENTS.local.md Learnings first), and after a notable outcome or a user correction (append a dated learning to AGENTS.local.md, which is injected into every session). Also runs the critical refinement loop: on a correction or repeated failure, prove it with evidence, note the root cause, and propose a fix to the skill/process at fault rather than mutating it directly."
---

# Memory

Learnings are written to `AGENTS.local.md` (or
`AGENTS.md` for rules everyone must see). `AGENTS.local.md` is loaded into the
system prompt every session by the agents-local extension, so a lesson
written there is guaranteed to be in context next session - no on-demand
recall needed. The same extension syncs the `work/` project table in that
file from disk each session; edit descriptions there, not the row list. This separates it from the Anotht vault (your knowledge) and
from `AGENTS.md` (standing rules).

Only cross-cutting lessons learned from experience belong here. Standing
policies go in `AGENTS.md`; fix-specific trivia stays with the project. Keep `AGENTS.local.md` small - every line costs tokens
in every session.

## Write after a correction or outcome

On a user correction, a repeated failure, or a notable outcome, append a dated
bullet under a `## Learnings` section in `AGENTS.local.md`:

```markdown
## Learnings

- YYYY-MM-DD: [the one reproducible lesson / hint]
```

Keep entries short. One useful hint beats a paragraph. If the lesson should
guide every agent, put it in `AGENTS.md` instead - other harnesses read
that, not `AGENTS.local.md`.

## Read before you act

`AGENTS.local.md` is already in your system prompt every session - check it
before acting. If a past entry says a given approach failed, say so and take
the other route.

## Critical refinement loop

On a user correction or a repeated failure, work the loop:

1. Name the exact correction/failure.
2. Gather evidence: the user's words, the failing command/output, the file path.
3. Decide whether the fault is in a skill/process or was a one-off mistake.
4. If it points at a skill defect, propose the change as a diff to that skill's `SKILL.md` (in chat, or a file under `plans/` for bigger rewrites) and wait for a human to approve before editing the
production skill.
5. Append the learning to `AGENTS.local.md` Learnings regardless.

The producer never grades its own homework: when reviewing your own work, reason from evidence and state what is wrong plainly.
