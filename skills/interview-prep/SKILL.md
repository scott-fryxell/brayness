---
name: interview-prep
description: Helps research a company and prepare for its hiring process -- company research, why-this-company/role fit exploration, behavioral (STAR) prep, technical/DSA prep, and tracking hiring stages through offer and negotiation. Use when asked to "research this company", "prepare for an interview at X", "help me get ready for an interview", "practice for a coding interview", "should I apply to X", "what's interesting about this company", "track my job search", or when the user names a target company/role they want to pursue.
---

# Interview Prep

Prepares a target company/role end-to-end: research, fit, behavioral prep, technical prep, and process tracking. All notes live in the vault under `02 Areas/Job Hunt/` (`work/vault/02 Areas/Job Hunt/`) -- see `references/process-and-tracker.md` for the exact layout.

## Workflow

1. **Capture the target.** Get company name, role, and how it came up (referral, job post, cold interest). Create `02 Areas/Job Hunt/Companies/<company-slug>.md` from `assets/company-note-template.md` if it doesn't exist. Add a row to `02 Areas/Job Hunt/tracker.md`.

2. **Research the company.** Read `references/research.md`. Use WebSearch/WebFetch to fill in product, stage, recent news, tech stack, competitors, culture signals. Write findings into the company note.

3. **Explore the fit.** Read `references/fit-and-story-bank.md`. Work through why this is actually interesting (not generic enthusiasm), cross-check the vault for existing related interests, and draft 2-3 tailored questions to ask interviewers.

4. **Prep for the format.** Determine what rounds are coming (or likely, from research/role type):
   - Behavioral round -> `references/fit-and-story-bank.md` STAR story bank.
   - Technical/DSA round -> `references/technical-prep.md`, including `work/kata-machine` for hands-on practice.
   - System design or take-home -> same file, relevant section.

5. **Track through the process.** Read `references/process-and-tracker.md`. Update `tracker.md` and the company note's hiring-process table as stages happen. Log post-interview notes right after each round while it's fresh.

6. **Offer stage.** When an offer lands, use the negotiation section of `references/process-and-tracker.md` before any number gets discussed live.

## Baselining

An interview is a shared baseline before it is a performance. Scott's pattern:
answer one part of a question, get to a shared footing on that part, then answer
the rest from there. Advancing to the next question before the floor is set
reads as noise, not rigor.

So when running a mock, bring him back. Confirm the part that landed, name it in
one line, then return to the same question for the next layer. One question at a
time. Don't advance until the current question has a floor.

This is also the thing he is evaluating. Can we set a comfortable baseline with
this company - can each side bring the other up to speed and keep them involved -
is a real criterion, not a soft one. Technical depth still has to be covered; it
just doesn't count if nobody is standing on the same ground.

## Notes

- Don't fabricate company facts (funding numbers, headcount, exec names) when research doesn't turn up a confident source -- state what's unknown instead.
- Keep the STAR story bank and DSA study notes reusable across companies; keep research and process notes per-company.
- If the user drops an external resource (a video, article) for a DSA topic, file it into that topic's vault study note (`02 Areas/Job Hunt/Study/<topic>.md` - see `references/technical-prep.md`) rather than losing it in conversation.
