# Validation Checklist

After copying files from dev `/brayness/` to `/brayness/work/brayness/`, run these validations.

## Pre-copy validation

Before copying, verify:

- [ ] Dev `/brayness/` has uncommitted changes that need syncing
- [ ] `work/brayness/` exists and has a `.git/` directory
- [ ] No uncommitted changes in `work/brayness/` (run `git status`)

## Post-copy validation

After copying, all of these must pass:

### Security checks

**No .env files**

```bash
find /brayness/work/brayness/ -type f -name '.env*'
# Should return nothing
```

**No git directories**

```bash
find /brayness/work/brayness/ -type d -name '.git'
# Should return nothing
```

### Structure checks

**Required directories exist**

```bash
test -d /brayness/work/brayness/skills && \
test -d /brayness/work/brayness/extensions && \
test -d /brayness/work/brayness/bin && \
test -f /brayness/work/brayness/package.json
# All should exist
```

**Directories are non-empty**

```bash
[ -n "$(find /brayness/work/brayness/skills -maxdepth 1 -type d | tail -n +2)" ] && echo "skills has subdirs"
[ -n "$(find /brayness/work/brayness/extensions -maxdepth 1 -type d | tail -n +2)" ] && echo "extensions has subdirs"
# Should show at least some content
```

### Git readiness

**No git errors**

```bash
cd /brayness/work/brayness/
git status
# Should show clean or modified files, no errors
```

**Can stage changes**

```bash
cd /brayness/work/brayness/
git add -A --dry-run
# Should work without errors
```

## Validation failure recovery

| Failure             | Cause                      | Fix                                                   |
| ------------------- | -------------------------- | ----------------------------------------------------- |
| `.env` found        | Secret files copied        | Delete `work/brayness/` copy, fix exclude pattern, retry |
| `.git/` found       | Nested project dirs copied | Check exclusion, manually remove `.git/` dirs, retry  |
| Missing directories | Copy was incomplete        | Verify source `/brayness/` has those dirs, retry copy    |
| Git status error    | Corrupted repo state       | Run `git status` in `work/brayness/`, fix issues, retry  |

If validation fails more than once, abort the sync and review the exclude patterns with the agent.
