---
name: brain-sync
description: Sync changes from dev brain/ to published brain/work/brain/ git repo. Copies skills, extensions, themes, prompts, sessions, and bin while excluding .git (from nested projects), .env (secrets), node_modules, and build artifacts. Validates the sync is clean (no secrets, no orphaned .git dirs, structure intact), shows git diffs, and proposes commits. Use when preparing releases, before tagging versions, or after major skill/extension changes. Triggers include "sync brain", "prepare release", "push changes to work/brain", or when the agent detects new skill commits and asks if you want to propagate them.
---

# Brain Sync

Keeps dev `/brain/` in sync with published `/brain/work/brain/` (the git-tracked mirror for releases).

## Concept

You develop in `/brain/` with full flexibility - nested git repos, temporary files, secrets, all the working chaos. The published version lives in `/brain/work/brain/` - clean, version controlled, ready to npm publish.

This skill copies changes one direction: dev → published, excluding secrets and build cruft, then validates the result is git-clean and safe to commit.

## When to run

- After creating or updating skills or extensions
- Before tagging releases
- When you want to propagate changes to the published repo
- When the agent detects new commits and asks if you want to sync

## Workflow

### Step 1: Detect changes

Agent scans `/brain/` for what's different since the last sync:

- New/modified skill or extension folders
- Changes to themes, prompts, sessions
- Updates to bin/ or package.json
- Files that should never be synced (secrets, nested .git dirs)

### Step 2: Plan the sync

Agent creates a plan file showing:

- What will be copied
- What will be excluded (and why)
- Estimated impact

You review and approve before copying.

### Step 3: Execute copy

Agent copies the following from `/brain/` → `/brain/work/brain/`:

- `skills/` (entire directory)
- `extensions/` (entire directory)
- `themes/` (entire directory)
- `prompts/` (entire directory)
- `sessions/` (entire directory)
- `bin/pi`
- `models.json`
- `settings.json`
- `AGENTS.md`
- `package.json`
- `README.md`
- `npm/README.md`
- `npm/.gitignore`

### Step 4: Validate

Agent validates the copy is safe:

- ✓ No `.git/` directories remain (nested repos stripped)
- ✓ No `.env` files present (secrets stayed in dev)
- ✓ No `node_modules/` or build artifacts
- ✓ Required folder structure exists
- ✓ `work/brain/` is git-ready (no git errors)

If validation fails, agent shows what went wrong and suggests fixes.

### Step 5: Review git diff

Agent runs `git diff` in `work/brain/` and shows:

- Files added, modified, deleted
- Line-level changes for key files (package.json, SKILL.md's)
- Overall impact summary

### Step 6: Propose commit

Agent suggests a commit message based on the changes:

- New skills added
- Major extensions updated
- Core files modified
- Version bump (if detected)

You review and approve before committing.

### Step 7: Commit (with trust)

Early on: Agent shows the proposed commit and asks for approval.
Over time: Agent can execute commits directly after validation passes and you've approved the diff.

## What gets synced

| Path                      | Included? | Reason                                |
| ------------------------- | --------- | ------------------------------------- |
| `skills/`                 | ✓         | Core skill catalog                    |
| `extensions/`             | ✓         | Core extensions                       |
| `themes/`                 | ✓         | UI themes                             |
| `prompts/`                | ✓         | Prompt templates                      |
| `sessions/`               | ✓         | Session configs                       |
| `bin/pi`                  | ✓         | Agent CLI                             |
| `package.json`            | ✓         | Dependencies and metadata             |
| `README.md`               | ✓         | Repo overview and setup               |
| `npm/README.md`           | ✓         | Add-on folder signpost                |
| `npm/.gitignore`          | ✓         | Keeps add-on storage gitignored       |
| `.git/` (nested)          | ✗         | Nested project repos stay in dev only |
| `.env`                    | ✗         | Secrets stay in dev                   |
| `node_modules/`           | ✗         | Build artifacts, too large            |
| `.DS_Store`, `dist/`, etc | ✗         | Working/temp files                    |

## Safety boundaries

1. **Never commit secrets** - Agent validates no `.env` files made it through
2. **Preserve git history** - Agent uses `git add` and `git commit`, not destructive wipes
3. **Show diffs before committing** - Agent always displays what changed before asking to commit
4. **Validate structure** - Agent ensures required folders exist and are non-empty
5. **Ask for approval early** - Agent gets explicit approval before committing until trust is built

## Trust progression

**Phase 1: Full transparency**

- Plan file reviewed
- Copy executed
- Diffs reviewed
- Commit approved explicitly

**Phase 2: Deferred approval**

- Plan shown
- Copy executed
- Diffs shown
- Commit proposed (auto-execute if you confirm)

**Phase 3: Autonomous** (only with explicit permission)

- Agent syncs and commits automatically on certain triggers (e.g., detected new skill commits)
- Still logs all actions, still validates

## Troubleshooting

**Validation fails: .git directories found**

- Some nested project folders weren't properly stripped
- Agent shows which folders have `.git/`
- Usually means a `work/<name>/` project got partially copied
- Solution: manually check the folder, agent can retry exclusion pattern

**Validation fails: .env found**

- Secret files were copied
- Revert the copy, never commit
- Agent will prevent this and alert

**Git conflict in work/brain/**

- If you've edited work/brain/ manually, git diff may show conflicts
- Agent alerts you to resolve in work/brain/ before syncing again
- Or, sync runs `git status` to warn about uncommitted changes first

## Commands the agent uses

```bash
# Detect what changed
diff -r /brain/ /brain/work/brain/ --exclude-dir=.git --exclude-dir=node_modules [...]

# Validate the copy
find /brain/work/brain/ -type d -name '.git' -o -type f -name '.env'

# Show git diff
cd /brain/work/brain/ && git diff --stat && git diff

# Propose commit
cd /brain/work/brain/ && git add -A && git commit --dry-run [...]

# Execute commit (with approval)
cd /brain/work/brain/ && git add -A && git commit -m "message"
```

## Next steps

When ready to sync:

- Tell the agent "sync brain" or "prepare a release"
- Agent will walk through the workflow above
- Review each step, approve diffs, and commits
- Result: `/brain/work/brain/` updated, committed, and ready to tag/publish
