# Sync Workflow Details

Commands for each step. Run from the dev repo root
(`/Users/scott/Desktop/brayness`). The copy list lives in `SKILL.md` - if
this file and SKILL.md disagree, SKILL.md wins and this file needs fixing.

## Step 1: Detect

```bash
# What differs in the copy-list trees (dirs)
diff -rq skills skills/brayness-sync/published/skills --exclude=.git --exclude=node_modules | head -30
diff -rq extensions skills/brayness-sync/published/extensions --exclude=.git --exclude=node_modules | head -30
diff -rq bin skills/brayness-sync/published/bin --exclude=.git --exclude=node_modules | head -30

# Single files
for f in package.json AGENTS.md README.md \
         .ignore .nvmrc \
         .pi/agent/settings.json .pi/agent/models.json; do
  cmp -s "$f" "skills/brayness-sync/published/$f" || echo "differs: $f"
done
```

## Step 2: Plan

Show changed paths, additions, exclusions. Get approval before copying.

## Step 3: Copy

```bash
rsync -av --delete \
  --exclude='.git' --exclude='.env*' --exclude='node_modules' \
  --exclude='.DS_Store' --exclude='dist' --exclude='build' \
  --exclude='/brayness-sync/published' \
  skills/ skills/brayness-sync/published/skills/

rsync -av --delete \
  --exclude='.git' --exclude='.env*' --exclude='node_modules' \
  --exclude='.DS_Store' \
  extensions/ skills/brayness-sync/published/extensions/

rsync -av --delete \
  --exclude='.git' --exclude='.env*' --exclude='node_modules' \
  --exclude='.DS_Store' --exclude='dist' --exclude='build' \
  bin/ skills/brayness-sync/published/bin/

rsync -av --delete --exclude='.DS_Store' \
  prompts/ skills/brayness-sync/published/prompts/


cp package.json AGENTS.md README.md .ignore .nvmrc skills/brayness-sync/published/

mkdir -p skills/brayness-sync/published/.pi/agent/npm
cp .pi/agent/settings.json .pi/agent/models.json skills/brayness-sync/published/.pi/agent/
cp .pi/agent/npm/README.md .pi/agent/npm/.gitignore skills/brayness-sync/published/.pi/agent/npm/

# Symlinks (recreate, don't copy targets)
# pi loads skills via --skill in bin/pi (no symlink). Cursor/Claude Code
# still read skills through their repo-root symlinks.
ln -sfn ../../extensions skills/brayness-sync/published/.pi/agent/extensions
ln -sfn ../skills skills/brayness-sync/published/.cursor/skills
ln -sfn ../skills skills/brayness-sync/published/.claude/skills

# NEVER copy sessions/, auth.json, trust.json, mcp caches, models-store.json
```

## Step 4: Validate

Run every check in `references/validation.md`. Stop on any failure.

## Step 5: Review diff

```bash
git -C skills/brayness-sync/published diff --stat
git -C skills/brayness-sync/published diff
```

Summarize; show key files (package.json, changed SKILL.md files) in full.

## Step 6: Commit (after approval)

```bash
git -C skills/brayness-sync/published add -A
git -C skills/brayness-sync/published commit -m "approved message"
git -C skills/brayness-sync/published log --oneline -3
```

Commit format: one line on what shipped (skills added/updated, config
changes), body listing the notable paths.

## If a step fails

Show the error, name the failing path, and stop. Fix in dev, re-run from
Step 1. Never commit a failed validation.
