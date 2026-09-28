# Validation Checklist

After copying files from dev `/Users/scott/Desktop/brayness/` to `/Users/scott/Desktop/brayness/skills/brayness-sync/published/`, run these validations.

## Pre-copy validation

Before copying, verify:

- [ ] Dev `/Users/scott/Desktop/brayness/` has uncommitted changes that need syncing
- [ ] `skills/brayness-sync/published/` exists and has a `.git/` directory
- [ ] No uncommitted changes in `skills/brayness-sync/published/` (run `git status`)

## Post-copy validation

After copying, all of these must pass:

### Security checks

**No .env files**

```bash
find /Users/scott/Desktop/brayness/skills/brayness-sync/published/ -type f -name '.env*'
# Should return nothing
```

**No git directories**

```bash
find skills/brayness-sync/published -mindepth 2 -type d -name '.git'
# Should return nothing (the mirror's own .git at depth 1 is expected)
```

### Structure checks

**Required directories exist**

```bash
test -d /Users/scott/Desktop/brayness/skills/brayness-sync/published/skills && \
test -d /Users/scott/Desktop/brayness/skills/brayness-sync/published/extensions && \
test -d /Users/scott/Desktop/brayness/skills/brayness-sync/published/bin && \
test -f /Users/scott/Desktop/brayness/skills/brayness-sync/published/package.json
# All should exist
```

**Directories are non-empty**

```bash
[ -n "$(find /Users/scott/Desktop/brayness/skills/brayness-sync/published/skills -maxdepth 1 -type d | tail -n +2)" ] && echo "skills has subdirs"
[ -n "$(find /Users/scott/Desktop/brayness/skills/brayness-sync/published/extensions -maxdepth 1 -type d | tail -n +2)" ] && echo "extensions has subdirs"
# Should show at least some content
```

### Git readiness

**No git errors**

```bash
cd /Users/scott/Desktop/brayness/skills/brayness-sync/published/
git status
# Should show clean or modified files, no errors
```

**Can stage changes**

```bash
cd /Users/scott/Desktop/brayness/skills/brayness-sync/published/
git add -A --dry-run
# Should work without errors
```

## Validation failure recovery

| Failure             | Cause                      | Fix                                                   |
| ------------------- | -------------------------- | ----------------------------------------------------- |
| `.env` found        | Secret files copied        | Delete `skills/brayness-sync/published/` copy, fix exclude pattern, retry |
| `.git/` found       | Nested project dirs copied | Check exclusion, manually remove `.git/` dirs, retry  |
| Missing directories | Copy was incomplete        | Verify source `/Users/scott/Desktop/brayness/` has those dirs, retry copy    |
| Git status error    | Corrupted repo state       | Run `git status` in `skills/brayness-sync/published/`, fix issues, retry  |

If validation fails more than once, abort the sync and review the exclude patterns with the agent.
