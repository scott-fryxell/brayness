# Sync Workflow Details

Step-by-step guide for the agent to execute the sync.

## Step 1: Detect changes

Before syncing, understand what changed in dev since the last sync.

```bash
# List new/modified skills
ls -la /brayness/skills/ | head -20

# List new/modified extensions
ls -la /brayness/extensions/ | head -20

# Check if bin/pi changed
ls -la /brayness/bin/pi

# Check if package.json changed
git -C /brayness/work/brayness/ diff HEAD -- package.json | head -30
```

**Output for agent**: List the major changes detected (new skills, updated extensions, etc).

## Step 2: Create a plan

Show the user what will happen:

```markdown
# Sync Plan

## Changes detected

- New skill: `skills/example-skill/`
- Modified: `skills/existing-skill/SKILL.md`
- Updated: `extensions/my-extension/`
- No changes to: bin/, settings.json, AGENTS.md

## What will be copied

- Source: /brayness/skills/ → Destination: /brayness/work/brayness/skills/
- Source: /brayness/extensions/ → Destination: /brayness/work/brayness/extensions/
- Source: /brayness/bin/pi → Destination: /brayness/work/brayness/bin/pi
- Source: /brayness/package.json → Destination: /brayness/work/brayness/package.json

## What will be excluded

- .git/ directories (from nested projects like work/agent-browser/)
- .env files (secrets)
- node_modules/ (build artifacts)
- .DS_Store, dist/, other temp files

## Ready to proceed?

- [ ] Review changes above
- [ ] Confirm you want to sync
```

**Ask the user to approve** before proceeding.

## Step 3: Execute copy

Use `rsync` for safe, atomic copying with exclusion patterns:

```bash
rsync -av \
  --delete \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='.DS_Store' \
  --exclude='dist' \
  --exclude='.next' \
  --exclude='build' \
  /brayness/skills/ /brayness/work/brayness/skills/

rsync -av \
  --delete \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='.DS_Store' \
  /brayness/extensions/ /brayness/work/brayness/extensions/

# NOTE: never rsync sessions/ - conversation transcripts may contain secrets
# or personal info, and the published repo gitignores the directory.

# Individual files
cp /brayness/bin/pi /brayness/work/brayness/bin/pi
cp /brayness/package.json /brayness/work/brayness/package.json
```

**Output for agent**: "Files copied. Running validation..."

## Step 4: Validate

Run all checks from `references/validation.md`.

If any check fails, show the error and stop. Ask user to fix or retry.

If all checks pass, continue to Step 5.

## Step 5: Show git diff

Display what changed in the published repo:

```bash
cd /brayness/work/brayness/

# Short summary
git diff --stat

# Full diff
git diff
```

For large diffs, show:

- Summary (files added/modified/deleted)
- Key files like `package.json` and `SKILL.md`s in full
- Large binary files (skip)

**Output for agent**: Clear, scannable diff that user can review.

## Step 6: Propose commit message

Analyze the changes and suggest a commit:

```bash
cd /brayness/work/brayness/

# Count changes by type
git diff --stat | tail -1  # shows total files/lines

# Look at package.json to infer version
grep '"version"' package.json
```

**Suggested commit format:**

```
Release: brayness-sync update [date]

- Added: list new skills/extensions
- Updated: list modified skills/extensions
- Changed: package.json or config updates

Synced from dev /brayness/ → published work/brayness/
```

**Ask the user** to review and approve the message before committing.

## Step 7: Commit

When user approves:

```bash
cd /brayness/work/brayness/
git add -A
git commit -m "your approved message"
```

**Output for agent**:

```
[main abc1234] Release: brayness-sync update...
 X files changed, Y insertions(+), Z deletions(-)
```

Show the commit hash and summary.

## Cleanup

After successful commit:

```bash
cd /brayness/work/brayness/
git log --oneline -5  # Show recent commits
```

**Output for agent**: "Sync complete. work/brayness/ is now up to date and ready to tag/release."

## Troubleshooting steps

If any step fails, show the error clearly and suggest:

1. Check the file system (does the source exist?)
2. Review the exclude patterns (is something being filtered by accident?)
3. Check git status in work/brayness/ (are there conflicts?)
4. Ask user if they want to skip this sync or fix and retry

Never proceed if validation fails.
