# Sync Workflow Details

Commands for each step. Run from the dev repo root
(`/Users/scott/Desktop/brayness`). The copy list lives in `SKILL.md` - if
this file and SKILL.md disagree, SKILL.md wins and this file needs fixing.

## Step 1: Detect

```bash
# What differs in the copy-list trees (dirs)
diff -rq skills work/sync/skills --exclude=.git --exclude=node_modules | head -30
diff -rq extensions work/sync/extensions --exclude=.git --exclude=node_modules | head -30

# Single files
for f in bin/pi package.json AGENTS.md README.md \
         .ignore .nvmrc \
         .pi/agent/settings.json .pi/agent/models.json .pi/agent/subagents.json; do
  cmp -s "$f" "work/sync/$f" || echo "differs: $f"
done
```

## Step 2: Plan

Show changed paths, additions, exclusions. Get approval before copying.

## Step 3: Copy

```bash
rsync -av --delete \
  --exclude='.git' --exclude='.env*' --exclude='node_modules' \
  --exclude='.DS_Store' --exclude='dist' --exclude='build' \
  skills/ work/sync/skills/

rsync -av --delete \
  --exclude='.git' --exclude='.env*' --exclude='node_modules' \
  --exclude='.DS_Store' \
  extensions/ work/sync/extensions/

cp .pi/agent/subagents.json work/sync/.pi/agent/subagents.json

install -m 755 bin/pi work/sync/bin/pi
cp package.json AGENTS.md README.md .ignore .nvmrc work/sync/

mkdir -p work/sync/.pi/agent/npm
cp .pi/agent/settings.json .pi/agent/models.json work/sync/.pi/agent/
cp .pi/agent/npm/README.md .pi/agent/npm/.gitignore work/sync/.pi/agent/npm/

# Symlinks (recreate, don't copy targets)
# pi loads skills via --skill in bin/pi (no symlink). Cursor/Claude Code
# still read skills through their repo-root symlinks.
ln -sfn ../../extensions work/sync/.pi/agent/extensions
ln -sfn ../skills work/sync/.cursor/skills
ln -sfn ../skills work/sync/.claude/skills

# NEVER copy sessions/, auth.json, trust.json, mcp caches, models-store.json
```

## Step 4: Validate

Run every check in `references/validation.md`. Stop on any failure.

## Step 5: Review diff

```bash
git -C work/sync diff --stat
git -C work/sync diff
```

Summarize; show key files (package.json, changed SKILL.md files) in full.

## Step 6: Commit (after approval)

```bash
git -C work/sync add -A
git -C work/sync commit -m "approved message"
git -C work/sync log --oneline -3
```

Commit format: one line on what shipped (skills added/updated, config
changes), body listing the notable paths.

## If a step fails

Show the error, name the failing path, and stop. Fix in dev, re-run from
Step 1. Never commit a failed validation.
