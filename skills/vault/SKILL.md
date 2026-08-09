---
name: vault
description: Read, search, and maintain the Anotht Obsidian vault (PARA-structured personal knowledge base covering projects, interests, and reference material). Use when the user asks about their notes, interests, or wants links categorized, feeds rebuilt, or raindrop imports cleaned up.
---

# Vault

The Anotht vault is a PARA-structured Obsidian brain.

## Location

The vault lives in the work directory:

```bash
VAULT=/Users/scott/Desktop/brayness/work/Anotht
```

Or relative from brayness root:

```bash
VAULT=./work/Anotht
```

## Structure

- `01 Projects/` -- active work: Blog, Music, Drawing, Nature, Realness, SMS, Anotht Agent
- `02 Areas/` -- ongoing interests: Cyberpunks (politics, think pieces, counter-culture), Engineering, Music (gear, genres, production), Storytelling, Writing
- `03 Resources/` -- reference material: AI, Art, Design, Engineering, Finance, Health, Manufacturing, Math, Writing
- `04 Archive/` -- inactive items
- `05 journal/` -- yearly journals
- `Clippings/` -- saved articles and links inbox (categorize into PARA sections)
- `Unsorted/` -- secondary inbox for uncategorized links

Each subfolder has a `:feed.md` with a dataview query listing its contents by date added. `:feed.md` is the convention for "show me what's in this section."

## Reading the vault

Use `read`, `rg`, or `find` directly against `$VAULT`. Examples:

```bash
# list a section
ls "$VAULT/02 Areas/Music/"

# literal search across the vault
rg -l "cowpunk" "$VAULT"

# show a section's feed
cat "$VAULT/02 Areas/Music/:feed.md"
```

Or from brayness root:

```bash
ls ./work/Anotht/Clippings/
rg -l "cowpunk" ./work/Anotht
cat "./work/Anotht/02 Areas/Music/:feed.md"
```

For semantic search ("what notes feel related to X"), no tool exists yet -
fall back to `rg` with synonyms.

## Recent activity

When asked "what's been happening recently in my vault" or "what's new":

```bash
VAULT=/Users/scott/Desktop/brayness/work/Anotht

# 1. Current journal -- newest entries at the bottom
read "$VAULT/05 journal/Journal.md"
read "$VAULT/05 journal/Journal $(date +%Y).md"

# 2. Most recently modified files across the vault (excludes dot dirs)
find "$VAULT" -name "*.md" \
  -not -path "*/.obsidian/*" -not -path "*/.git/*" \
  -exec stat -f "%m %Sm %N" {} + 2>/dev/null \
  | sort -rn | head -30

# 3. Recently added files per section (by ctime = when file was created)
for section in "01 Projects" "02 Areas" "03 Resources"; do
  find "$VAULT/$section" -name "*.md" -not -name ":feed.md" \
    -exec stat -f "%m %Sm %N" {} + 2>/dev/null \
    | sort -rn | head -10
  echo "---"
done

# 4. Check inboxes
find "$VAULT/Clippings" -name "*.md" -mtime -30 2>/dev/null | sort
find "$VAULT/Unsorted" -name "*.md" -mtime -30 2>/dev/null | sort
```

**Note**: All files in the vault may share the same ctime/mtime (common after a git clone or bulk operation). In that case, rely on the journal content and `created` date in YAML frontmatter instead of filesystem timestamps.

Also check specific project notes for structured updates (release notes, TODOs, design briefs):

```bash
for project in Realness SMS Blog; do
  echo "=== $project ==="
  ls "$VAULT/01 Projects/$project/" | grep -i -E "(todo|release|log|status|notes|update)" | head -5
done
```

## How feeds work

Each `:feed.md` contains a Dataview query that reads `created` (YAML frontmatter) to list items chronologically. Starred repos appear alongside regular notes by their repo creation date. The `github` column shows `owner/repo` for stars, blank for regular notes:

```dataview
TABLE created AS "Date", github AS "Source"
FROM "02 Areas/Music"
WHERE file.name != ":feed"
SORT created DESC
```

Regenerate all feeds from `skills/vault/`:

```bash
bash rebuild-feeds.sh
```

## Maintenance

```bash
./clean-raindrop.py        # convert raindrop-imported notes to rich cardlinks (one-shot; already run on backlog)
./add-frontmatter.sh       # batch add YAML frontmatter to files missing it (extracts source URL, author from domain)
./add-stars.sh             # sync GitHub starred repos into vault (idempotent, skips existing via github: frontmatter key)
./rebuild-feeds.sh         # regenerate all :feed.md files (runs after add-stars.sh to surface new entries)
```

### GitHub stars sync

`add-stars.sh` fetches all starred repos for `scott-fryxell`, categorizes each into the right PARA section using `skills/vault/github-stars-map.yaml` rules (topic matching with language/description fallbacks), and creates a note with `github: owner/repo` frontmatter. Re-runs are safe -- existing notes are skipped.

See `skills/vault/github-stars-map.yaml` for the categorization mapping. Override any misclassification by moving the note to the right directory and the feed will pick it up.

## Filing conventions

- Filename is the title -- do not duplicate it as a heading inside the note.
- Bare URLs trigger the auto-card-link plugin; do not wrap them.
- Cyberpunks holds politics, think pieces, and counter-culture.
- Unsorted is the inbox; anything there should be categorized into a PARA section and removed from Unsorted.
- **Add `created` date in frontmatter when organizing** -- use the file's original timestamp. Preserves capture date if files are ever copied/moved (filesystem ctime changes, frontmatter survives).
- **Frontmatter format:**
  ```yaml
  ---
  title: "Filename as Title"
  source: "https://example.com/article" # extracted from first URL in file
  author:
    - "[[Domain]]" # derived from source URL
  published:
  created: YYYY-MM-DD # from filesystem ctime
  description: ""
  tags:
    - "reference"
  ---
  ```
