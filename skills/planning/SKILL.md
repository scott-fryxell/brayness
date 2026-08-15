---
name: planning
description: >-
  Plan complex or creative work as a directed acyclic graph (DAG / mind-map)
  before executing, keeping the human as the decider at every gate. Use when a
  task branches, explodes like a mind map, or is a creative project - anything
  with parallel or dependent pieces a linear checklist would flatten. Produces
  an ordered, reviewable plan, checks in at each gate, then executes. Built from
  the Building an Advanced Agentic Harness article's Planner role, inverted per
  brayness's plan doc (the harness plans, the human decides).
metadata:
  category: Workflow
  tags:
    - planning
    - dag
    - mind-map
    - orchestration
    - human-in-the-loop
related_skills:
  - critic
  - project-tooling
  - skill-finder
  - hyperframes
---

# Planning

Plan work as a directed acyclic graph before doing it. The DAG is the Planner
step from the harness article; brayness's plan doc inverts it - the agent
proposes, you approve, then execution runs. This skill never runs a crew solo.

## When to use

- Work that branches, rejoins, or explodes like a mind map or creative project.
- Several pieces of work with dependencies between them.
- A task big enough that "just do it" would bury its own shape.

Skip it for trivial or purely linear tasks - planning has a cost, spend it where
it pays.

## Core rule: the graph is the plan, you are the gate

The DAG is a directed acyclic graph: nodes are units of work, edges are
dependencies. Build the graph, then check in with you at each decision gate.
You approve before anything executes. The agent never self-runs the whole DAG.

## Process

### 1. Build the DAG

- List every unit of work as a node: id, one-line goal, effort (cheap/medium/expensive).
- Draw edges only where one node actually depends on another.
- Keep it a DAG - no cycles. A cycle means the plan is muddled; break it.
- Aim for small nodes that parallelize cleanly. Split anything that would become
  a paragraph to describe.

### 2. Render it for review

Render the graph so you can read it in one glance, e.g.:

```
[a] research angle     [c] draft section 1
  \                     /
   [b] pick sources  [d] assemble
```

Prefer ASCII text (this harness). Use `->`, `[id]`, and indentation so the
dependency structure is visible without a diagram tool. Show effort per node.

**Persist the DAG into `plans/`.** A plan worth building is worth keeping - it
is the reviewable artifact, not throwaway scaffolding. Write it into the
existing `plans/<plan>.md` (as a "DAG plan" section) or, if that file should
stay pure spec, a companion `plans/<plan>.plan.md`. Keep one file per plan;
do not proliferate. Record the gate decisions there too (approved shape,
changes you made, what the user chose). This is how plans actually live in
Scott's `plans/` and stay reviewable across sessions.

### 3. Gate 1 - approve the shape

Before any execution:

- Present the rendered DAG and the proposed order.
- Ask one question: is the shape right? Only what would change the plan's
  topology - added/removed/merged nodes, wrong dependencies, wrong order.
- Wait. Do not start executing until you say go.
- If slices are wrong, revise the DAG and re-present. This is the human-decider
  contract; do not skip it.
- Record the outcome in the `plans/` file as soon as the shape is settled, so
  the artifact exists even if work pauses.

### 4. Execute

Take nodes in topological order - every node only after its dependencies are
done. Run nodes that have no dependency between them in parallel where the
harness allows.

A "node" need not mean a subagent; plain execution is fine. Use a helper only
when a node genuinely benefits from isolation (heavy tooling, a different model,
a long-running chunk). Do not spin up helpers by default.

### 5. Critic - verify before moving on

After each node (or at each merge point), apply the `critic` skill: cheapest
deterministic check first. If a node changes the shape of later work, pause and
check in before continuing to the next gate.

### 6. Promote - tell people when it earns it

After the critic passes, ask: is this worth promoting? Two triggers:

- A feature that is genuinely fun or a great showcase of the service (e.g. the
  lava lamp feature).
- Documentation good enough to show off.

Channels: YouTube, TikTok, and the `About.vue` page. Motion graphics are the
preferred medium (see the `hyperframes` skill). Add promote nodes to the DAG
like any other work - they gate on the feature being verified, and the human
approves the promo before it ships.

If neither trigger fires, skip this step; most nodes do not get promoted.

### 7. Gate 2 - check in at the end

Before calling anything done:

- Summarize what ran and what the DAG produced.
- Ask whether the result meets the plan or needs another pass.
- Never declare done and silently move on; the final gate is yours.

## Human-in-the-loop rules

- Every gate pauses for you. No autonomous "crew" run like the article's.
- One question at a time at each gate; no question bombs (see AGENTS.local).
- If a node would change the plan's shape mid-run, stop and re-present, don't
  quietly continue.
- For a task you've clearly underspecified, ask a focused clarifying question
  before building the DAG, not after.

## Cost and scope

- Planning is a cost, not an asset (see exploration-cost learning). A tidy
  one-screen DAG is the deliverable, not scaffolding files or scripts.
- The DAG goes in a `plans/` file (see step 2) because it is the reviewable
  plan artifact. This is distinct from throwaway exploration scaffolding - the
  plan earns its place by being the thing you review and reconsider.

## Related

- `critic` - the Critic step; producer never grades its own homework.
- `project-tooling` - read a project's scripts before planning execution inside it.
- `skill-finder` - when a node in the DAG needs a capability you don't have.
- `hyperframes` - motion graphics for the Promote step.

## Source

Article: "Building an Advanced Agentic Harness" (data4sci, 2026-07-15), vault
clipping `work/Anotht/Clippings/Building an Advanced Agentic Harness.md`.
Goal doc: `work/Anotht/the-harness-is-the-thing.md` and the plan
`plans/harness-capabilities-internalize.md`.
