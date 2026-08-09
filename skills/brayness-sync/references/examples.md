# Brayness Sync Examples

## Happy path: Routine sync with new skill

**Scenario**: You created a new skill `brayness-sync` and updated `personal-context` extension. Ready to release.

**Agent detects**:

```
Changes found:
- New skill: skills/brayness-sync/SKILL.md (+ references/, ...)
- Modified: extensions/personal-context/index.ts
- No changes to bin/, .pi/agent/settings.json, AGENTS.md
```

**Plan**:

```
Will copy: skills/ (new brayness-sync included), extensions/ (personal-context updated)
Excluding: .git/, .env, node_modules/, etc.
Impact: 15 files added, 3 modified, 0 deleted
```

**User approves** -> Agent copies files -> **Validation passes** all checks

**Git diff**:

```
skills/brayness-sync/SKILL.md                  | 150 ++++++++
skills/brayness-sync/references/validation.md  | 60 +++
skills/brayness-sync/references/workflow.md    | 200 +++++++++
extensions/personal-context/index.ts             | 25 +-
4 files changed, 434 insertions(+), 10 deletions(-)
```

**Proposed commit**:

```
Release: brayness-sync + personal-context update

- Added: brayness-sync skill (copy changes, validate, commit to work/brayness/)
- Updated: personal-context extension
- Synced: dev -> work/brayness/ for release

Ready to tag v1.2.0
```

**User approves** -> **Commit succeeds** -> Ready to npm publish

---

## Validation failure: Secret leaked

**Scenario**: You accidentally committed an API key to `skills/my-skill/.env` in dev.

**Validation fails**:

```
✗ SECURITY: .env file found
  Location: /brayness/work/brayness/skills/my-skill/.env

Action: STOP - Do not commit. Secret file was copied.

Steps:
1. Fix: Delete work/brayness/skills/my-skill/.env
2. Delete: dev /brayness/skills/my-skill/.env
3. Commit secret removal to dev history
4. Retry sync
```

**Agent output**:

```
ERROR: Secret file detected. Sync aborted.

You have a .env in dev that should never be synced.
Fix it in /brayness/skills/my-skill/.env, then we'll retry.
```

---

## Successful recovery: Nested .git directory stripped

**Scenario**: You symlinked a submodule into `extensions/` and the copy caught nested .git dirs.

**Validation initially fails**:

```
✗ Git corruption: .git directory found
  Location: /brayness/work/brayness/extensions/my-submodule/.git
```

**Agent suggests**:

```
Nested repo detected in extensions/. This is expected for submodules in dev.
The rsync command should have excluded it, but something went wrong.

Check: ls -la /brayness/extensions/my-submodule/
If it has .git/, the exclude pattern didn't work.

Options:
1. Manually remove .git: rm -rf /brayness/work/brayness/extensions/my-submodule/.git
2. Retry sync with stricter exclusion
3. Skip this extension and investigate dev setup
```

**User removes the .git** -> **Validation passes on retry** -> **Sync continues**

---

## Multi-change sync with version bump

**Scenario**: Several skills and one extension updated, plus package.json version bump for release.

**Detected changes**:

```
Skills updated:
  - test-javascript-patterns/SKILL.md
  - vault/SKILL.md
  - hyperframes/SKILL.md (major update)

Extensions updated:
  - html/index.js

Configuration:
  - package.json version 1.1.0 -> 1.2.0
```

**Plan** (condensed):

```
Will sync: 4 skills, 1 extension, version bump
Files: ~200 changed, 15 new
Excluded: .git/, .env, node_modules/ (as always)
Size impact: ~1.5 MB
```

**Diff shows**:

```
skills/test-javascript-patterns/SKILL.md  | 45 ++++----
skills/vault/SKILL.md                      | 120 ++++++++++++++++++++
skills/hyperframes/SKILL.md                | 300 ++++++++++++++++++++
extensions/html/index.js                   | 80 +++++------
package.json                               | 2 +-
5 files changed, 485 insertions(+), 65 deletions(-)
```

**Proposed commit**:

```
Release v1.2.0: Skills + extension updates

Skills:
- test-javascript-patterns: improved coverage guidance
- vault: PARA structure refinements
- hyperframes: major API enhancements

Extensions:
- html: semantic element detection improvements

Synced from dev -> work/brayness/
```

**User approves** -> **Commit executes** -> Git log shows:

```
abc1234 Release v1.2.0: Skills + extension updates
def5678 Previous release v1.1.0
```

**Ready to tag and npm publish**:

```bash
cd /brayness/work/brayness/
git tag v1.2.0
npm publish
```
