# Technical Interview Prep

## Contents
- Role-type focus areas
- DSA practice via kata-machine
- Study notes per topic
- System design (senior+ roles)
- Take-homes

## Role-type focus areas

| Role type | Primary focus | Secondary |
|-----------|---------------|-----------|
| Frontend | Framework internals (reactivity, rendering), browser APIs, perf, accessibility | Light DSA, system design (client-side) |
| Backend / fullstack | Data structures & algorithms, system design, DB/schema design | API design, concurrency |
| Data / ML | Stats, SQL, model evaluation, take-home case study | Light DSA |
| PM | Product sense, metrics, case studies, prioritization frameworks | Technical fluency for the domain |
| Design | Portfolio walkthrough, design critique, whiteboard exercise | Product sense |
| EM / staff+ | System design, org/people scenarios, technical judgment | Coding (lighter bar, still expected) |

Pick the row matching the target role before planning a study block. Don't run generic DSA grind for a PM or design interview.

## DSA practice via kata-machine

`work/kata-machine` is a local deno-based kata generator (forked from ThePrimeagen's kata-machine) covering common interview data structures and algorithms -- sorting, searching, lists, trees, graphs, maps, recursion -- plus a further-study set drawn from *Grokking Algorithms* (Bhargava): self-balancing trees (AVL, red-black, splay, B-tree), inverted indexes, the Fourier transform, MapReduce, parallel algorithms/Amdahl's law, linear regression, Bloom filters/HyperLogLog, SHA-256/Diffie-Hellman, and linear programming (simplex). Full topic list: `outlines/*.js` in that repo.

Workflow:
1. `cd work/kata-machine && deno task generate` -- creates the next `src/dayN` kata folder from `outlines/`.
2. Solve it in `src/`, compare against the matching `outlines/` file for the expected interface.
3. `deno test` -- runs the suite in `tests/`.
4. Log the topic and outcome in the vault study note for that topic (see below) -- what was hard, what clicked, what to redo.

Use this for warm-up reps before a technical round, not as the only prep -- pair it with mock explanation out loud (interviewers grade communication, not just a working solution).

## Study notes per topic

Keep one note per DSA topic in `02 Areas/Job Hunt/Study/<topic>.md` in the vault (e.g. `RingBuffer.md`, `Trees.md`). Each note holds:

- Link to the kata-machine source: `work/kata-machine/src/<topic>.js` and `outlines/<topic>.js`
- External resources (YouTube videos, articles, papers) the user collects for that topic
- Notes from working through it: the intuition, the gotcha, complexity tradeoffs
- Attempt log: date, how it went, what to revisit

When the user drops a resource link for a topic ("I have a video on ring buffers"), append it to that topic's note under a `## Resources` heading rather than losing it in conversation. Create the note if it doesn't exist yet, using the existing `:feed.md` convention for the `Study/` folder so it shows up in the vault's dataview feed.

## System design (senior+ roles)

For roles where system design rounds are likely, prep as its own track:
- Practice the standard loop: clarify requirements -> back-of-envelope estimate -> high-level design -> deep dive -> failure modes/scaling.
- Keep 2-3 systems memorized well enough to adapt (e.g. a feed, a rate limiter, a URL shortener) rather than memorizing many shallowly.
- Note company-specific scale hints from research (their actual traffic/scale) to calibrate estimates.

## Take-homes

If the process includes a take-home: confirm the time box, ask about eval criteria if unclear, and prioritize a working, tested, readable solution over exhaustive feature coverage. Note the deadline and submission format in the company's tracker row.
