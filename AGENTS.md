# Brayness

_A harness for your anxious digital brain._

A personal monorepo workspace: professional projects, personal tools, skills,
and a thinking space.

## Workspace

Projects: `work/<name>/` - each has its own git (e.g. `work/web`).

Cursor: open the project folder when coding (`work/web`). Open the repo root for
skills only. One repo-root window + nested `.git` dirs = Agent search broken
(Cursor limitation, not fixable with ignore files).

## Dependencies

See `README.md` for the full picture. Short version:

- **The app** - root `node_modules/` (pi). Update: `npm install`
- **The add-ons** - `npm/node_modules/` (packages from `settings.json`). Update:
  `./bin/pi update --extensions`

The folder `npm/` is pi's add-on storage, not the npm program. Do not edit
either `node_modules/` tree by hand.

## Personal context

This repo ships a `personal-context` extension (see
`extensions/personal-context/`) that auto-loads an `AGENTS.local.md` file from
the current directory or an ancestor, and appends it to the system prompt. Use
it for machine-local or sensitive context you do not want to commit:

1. Create `AGENTS.local.md` next to your `AGENTS.md`.
2. Add it to `.gitignore` (already in the repo's `.gitignore`).

See `extensions/personal-context/README.md` for details.

## Skills

Skills live in `skills/` (source of truth: one folder per skill, each with a
`SKILL.md`).

**Agent loading**: Cursor loads project skills from `.cursor/skills` (symlink to
`../skills`). `.claude/skills` uses the same symlink for Claude Code.

## Preferences

### Dyslexia and reading load

Word bloat is a real problem, not a style preference. Long or repetitive
output costs real effort to read, so the rules below are a hard constraint,
not a stylistic lean. No synonyms, recap paragraphs, or restating a point in
different words.

### Output and length

- Answers start on line 1; reasoning follows only when it helps.
- Substance first; no filler openers or sign-offs.
- When the task is clear, proceed; restate only to clarify scope.
- Default to bullets, tables, short chunks, clear headings; prose when depth is
  wanted.
- About two to six sentences unless asked to go deeper.
- Say each thing once; trim anything that does not change meaning or accuracy.

### Typography (ASCII only)

- Hyphens instead of em dashes.
- Straight quotes in ASCII text.
- Three dots `...` instead of the ellipsis character.
- Hyphens or asterisks for bullets, not Unicode bullet characters.

### Communication

- Main point before preamble or praise.
- Strong agreement reserved for claims we can verify.
- Wrong answers: plain correction, no hedge theater.
- Correct answers: re-check on pushback instead of flipping to agree.
- Light on flattery; describe what is true.
- No "As an AI..." framing. No performative emotion.

### Accuracy

- Ground claims in what was actually read; open files and trace symbols before
  citing.
- Say plainly when something is unknown.

## Code

Readability is king. Smallest change that satisfies the ask.

### Quality

- `snake_case` for variables and functions.
- No semicolons.
- Modern JavaScript where it fits.
- Dashes in URLs and file paths.
- Prefer CSS nesting and semantic HTML over extra class names.
- Let errors surface; `try`/`catch` for control flow or recovery, not by
  default.
- Single-line `if` when readable.

### Types

- JSDoc for types; imports at the top of the file.
- Shared types in `/src/types.js`.
- Item ID returns follow `/src/utils/itemid.js`.

### Tooling

- `/.editorconfig`, `/prettier.config.js`, `/eslint.config.js`
- Prefer project scripts (`npm run lint`, `npm run format`, `npm run type`,
  `npm run test`) over raw `npx` calls for the same tools. The scripts exist for
  a reason.

### Habits

- Confirm requirements before writing code; pause multi-step work until asked.
- Minimal changes; we like our existing code.
- Unit tests that fit the feature touched.
- Go ahead and use `console.log` for debugging or while working through a
  feature. We can remove them before commit.
- No fallback code.
- Safety and legal caveats only when risk is real.

### Fixing bugs

Quality is built as we go. A fix and its test are one change.

- Prove the test earns its place: revert the fix and watch it fail.
- If a test only goes green after loosening a mock, suspect the mock.
- Say when a fix uncovers the next one; do not widen the change quietly.
