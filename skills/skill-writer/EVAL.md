# Skill Writer Eval Prompts

Reusable eval templates for when deeper evaluation matters (high-risk skill,
regression tracking, or explicit request). Optional guidance artifacts, not
required output for every skill.

Fill the `{{placeholders}}` in a template, save it to a file, and run it through
whichever harness you are in (see Runbook).

## Template: integration/documentation depth eval

```text
Use the `skill-writer` skill to synthesize a new skill named `{{skill-name}}`
for working with `{{subject}}` as a consumer in downstream projects.

Primary objective: produce a non-surface-level integration skill covering API
surface, known issues/workarounds, and common real-world use cases.

Scope:
- Source root: `{{source-root}}`
- This is for USING {{subject}}, not editing its internals.

Mandatory source retrieval:
- README, CHANGELOG
- Public entry points and type definitions
- Test files covering the primary APIs
- Usage scan for the key APIs: {{key-apis}}

Required depth artifacts:
- `references/api-surface.md`
- `references/common-use-cases.md` (at least 6 concrete downstream use cases)
- `references/troubleshooting-workarounds.md` (at least 8 failure modes with fixes)
- `references/integration-patterns.md` (happy path, robust variant, anti-pattern + correction)

Depth gates (hard fail if missing):
- Coverage matrix includes: API surface, options/config, runtime lifecycle,
  event semantics, failure modes, version variance, downstream usage patterns.
- Any partial coverage includes explicit next retrieval actions.
- Qualitative depth rubric includes pass/fail for API/workaround/use-case/gap handling.
- Run the validator and report its output.

Output sections:
1) Summary
2) Changes Made
3) Validation Results
4) Open Gaps
```

## Pass/fail rubric

Pass only if all required artifacts exist and have the requested depth.
Fail if API mapping is partial, workaround guidance is shallow, or use cases are
generic and not actionable.
Fail if completion is claimed with unresolved high-impact gaps and no next
retrieval actions.

## Runbook

Run the eval against a throwaway copy so a bad run cannot touch the real skills.

```bash
EVAL_DIR=/tmp/skill-writer-eval-run
rm -rf "$EVAL_DIR" && mkdir -p "$EVAL_DIR"
rsync -a --exclude=.git --exclude=node_modules ./ "$EVAL_DIR"/
cd "$EVAL_DIR"
```

Then invoke the harness you are in, non-interactively, with the filled-in
template as the prompt:

| Harness     | Command                                          |
| ----------- | ------------------------------------------------ |
| pi          | `./bin/pi -p --no-session "$(cat eval-prompt.txt)"` |
| Claude Code | `claude -p "$(cat eval-prompt.txt)"`             |
| Cursor      | `cursor-agent -p "$(cat eval-prompt.txt)"`       |

For deterministic traces to diff baseline against candidate, add the harness's
JSON output flag (pi: `--mode json`).

Validate whatever the run produced:

```bash
uv run skills/skill-writer/scripts/quick_validate.py \
  skills/{{skill-name}} \
  --skill-class integration-documentation \
  --strict-depth
```

Nothing from `$EVAL_DIR` lands in the repo until you have read the diff.
