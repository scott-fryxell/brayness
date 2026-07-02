# Troubleshooting

## No match for query

**Symptom:** `No SVGL match for: Final Cut Pro`

**Fix:** Try shorter query (`final cut`), `--search` to inspect titles, browse https://svgl.app/. Then run `commons.sh --search final`. Add a Commons row if you find an SVG on https://commons.wikimedia.org/. Otherwise use the official press kit or leave the logo out.

## Commons not in manifest

**Symptom:** `No commons manifest entry for: Final Cut Pro`

**Fix:** Search Commons for `{name} logo` SVG, resolve upload URL via API (see [commons.md](commons.md)), append tab row to `assets/commons-logos.tsv`, re-run `commons.sh`.

## Wrong logo (app icon vs product)

**Symptom:** Grayscale app icon instead of product mark.

**Fix:** Scripts skip `subTitle` entries when possible. If still wrong, `--search` and pick a different title manually; fetch with direct filename: `curl -fsSL https://api.svgl.app/svg/photoshop.svg -o out.svg`.

## `route` is light/dark object

**Symptom:** jq error or empty filename.

**Fix:** Use `logo.sh --dark` or `--light` (default). Read both URLs from `--search` JSON.

## Rate limit / curl failures

**Symptom:** HTTP 429 or intermittent failures.

**Fix:** Pause between batch lines; commit cached SVGs; re-run failed names only.

## Multicolor SVG in monochrome UI

**Symptom:** Logo clashes with blue/red site palette.

**Fix:** Do not force `currentColor` on brand marks. Use smaller size, neutral strip background, or official monochrome asset from `brandUrl` if required.

## Adobe / Apple trademark concern

**Symptom:** Unclear if marketing page can show mark.

**Fix:** Open `brandUrl` from search JSON (e.g. Adobe permissions). Prefer "Export to Illustrator" copy + logo over implying partnership.

## Sprite `<use>` shows nothing

**Symptom:** Symbol id mismatch or external fill stripped.

**Fix:** Confirm `id` in `icons.svg` matches `icon` name; keep brand files as `<img>` if not single-color.

## jq: command not found

**Fix:** `brew install jq`

## dirname on output path

**Symptom:** Writing `figma.svg` without folder fails mkdir.

**Fix:** Pass path with directory: `public/brands/figma.svg`

## Duplicate titles in search

**Symptom:** Multiple "Illustrator" hits.

**Fix:** Script prefers no `subTitle`; verify output with `--search` before batch.

## SVG missing viewBox after edit

**Symptom:** Layout collapses in rotator.

**Fix:** Preserve `viewBox` from SVGL; do not strip when optimizing locally.
