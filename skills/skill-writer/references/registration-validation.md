# Registration and Validation

Apply repository registration and quality checks before completion.

## Registration checklist (brayness)

1. Create/update `skills/<name>/SKILL.md` at the repo root `skills/` folder.
2. Nothing else to wire: pi, Cursor, and Claude Code all load `skills/`
   through symlinks (`.pi/agent/skills`, `.cursor/skills`, `.claude/skills`).
3. Frontmatter must be valid YAML (`name`, `description`); quote the
   description if it contains a colon.

## Validation checklist

1. Run:

```bash
uv run skills/skill-writer/scripts/quick_validate.py skills/<name> --strict-depth

# Sweep every skill
for d in skills/*/; do uv run skills/skill-writer/scripts/quick_validate.py "$d"; done
```

2. Confirm for authoring/generator skills:
- transformed examples exist in references (happy-path, secure/robust, anti-pattern+fix)
- synthesis depth gates are satisfied
- selected example profile requirements are satisfied and reported

3. Confirm for integration/documentation skills:
- `references/api-surface.md` exists
- `references/common-use-cases.md` exists with sufficient depth
- `references/troubleshooting-workarounds.md` exists with sufficient depth
- `SKILL.md` and `references/*.md` avoid host-specific absolute filesystem paths

4. Confirm evaluation outputs as applicable:
- lightweight qualitative summary (recommended default)
- deeper eval or quantitative summary only if user requested benchmark mode or risk warrants it

5. Reject shallow handoffs that omit required artifacts.

## Required output

- Registration changes summary
- Validator output
- Evaluation summary status
- Any residual risks or open gaps
