---
name: logo-finder
description: Find and install brand SVG logos via SVGL (https://svgl.app/) and Wikimedia Commons fallbacks into any project's static asset folder. Use for company logos, integration rows, social proof, or refreshing a brands directory. Pair with copywriting for social-proof copy.
---

# Logo Finder (SVGL + Commons)

Download brand logos into a static asset folder of your choice. **Prefer SVG** (`.svg`); use PNG only when Commons/Wikipedia has no vector (e.g. [Final Cut Pro](https://en.wikipedia.org/wiki/Final_Cut_Pro#/media/File:FinalCutProACS2026.png)). Commit assets with the repo.

**Primary:** [SVGL API](https://svgl.app/docs/api)
**Fallback:** curated [Wikimedia Commons](https://commons.wikimedia.org/) rows in `assets/commons-logos.tsv` (see [references/commons.md](references/commons.md))

## How files are created

### SVGL

1. **Search** - `GET https://api.svgl.app?search={product name}`
2. **Download** - `GET https://api.svgl.app/svg/{filename}`
3. **Save** - `{out_dir}/{slug}.svg` where `slug` is lowercase-hyphenated (`DaVinci Resolve` -> `davinci-resolve`).

### Commons (when SVGL misses)

1. Find SVG on Commons (or use a known file page, e.g. [DaVinci Resolve 17 logo](https://commons.wikimedia.org/wiki/File:DaVinci_Resolve_17_logo.svg)).
2. Add `slug`, `upload_url`, wiki link, and `product_name` to `assets/commons-logos.tsv`.
3. Run `commons.sh` or pass the upload URL directly with `--url`.

## Scripts

Requires `curl` and `jq` (`brew install jq`).

```bash
# SVGL - one logo
bash skills/logo-finder/scripts/logo.sh Figma path/to/brands/figma.svg
bash skills/logo-finder/scripts/logo.sh "Premiere Pro" --search

# SVGL - batch from a list (one brand per line)
bash skills/logo-finder/scripts/batch.sh skills/logo-finder/examples/sample-brands.txt path/to/brands

# Commons - manifest entry or direct upload URL
bash skills/logo-finder/scripts/commons.sh "DaVinci Resolve" path/to/brands/davinci-resolve.svg
bash skills/logo-finder/scripts/commons.sh --url 'https://upload.wikimedia.org/.../file.svg' path/to/brands/file.svg
```

Not fetched at runtime on the live site - only during install. Commit the downloaded assets.

## Where to place logos - ask first

Never assume the output directory. **Ask the user where logos should go** before downloading. If they have no preference, propose a best-practice path based on the project's framework:

| Framework               | Default path                | Served as                   |
| ----------------------- | --------------------------- | --------------------------- |
| Vite (Vue/React/Svelte) | `public/brands/`            | `/brands/{slug}.svg`        |
| Next.js                 | `public/brands/`            | `/brands/{slug}.svg`        |
| Astro                   | `public/brands/`            | `/brands/{slug}.svg`        |
| SvelteKit               | `static/brands/`            | `/brands/{slug}.svg`        |
| Django/Flask            | `static/brands/`            | `/static/brands/{slug}.svg` |
| Rails                   | `app/assets/images/brands/` | asset pipeline              |

Conventions worth keeping:

- One folder, named `brands/` or `logos/` (pick one, stay consistent).
- Slug filenames: lowercase, hyphenated (`DaVinci Resolve` -> `davinci-resolve.svg`).
- Prefer a single committed folder over scattered per-component copies - logos are shared assets.
- Commit SVGs to the repo; do not fetch at runtime.

If the project already has a logo folder in use, reuse it. Confirm the served URL prefix so the slug paths you wire into markup match.

## Workflow

1. **Ask** the user where logos should be saved, or propose the best-practice default for the framework.
2. Identify the brands you need - build a list (one name per line) or read names from the page/component you are wiring.
3. Run `batch.sh <list> <out_dir>`.
4. For misses: `logo.sh <name> --search`, browse SVGL, or search Commons and append a `commons-logos.tsv` row.
5. Wire the saved assets into your page (static `<img src="/{brands}/{slug}.svg" ...>` or framework equivalent).
6. **Git add** the assets.
7. Verify the served path returns SVG (not HTML).

## Finding missing logos in an existing page

There is no `missing-from-about` script. Instead, read the target file and find logo references that are empty or use a placeholder icon, then feed those names to `batch.sh` or `logo.sh`. This keeps the skill independent of any one template format.

## API surface (summary)

| Task           | Request                                                          |
| -------------- | ---------------------------------------------------------------- |
| SVGL search    | `GET https://api.svgl.app?search={query}`                        |
| SVGL SVG       | `GET https://api.svgl.app/svg/{filename}`                        |
| Commons upload | Row in `assets/commons-logos.tsv` or Commons API `imageinfo.url` |

See [references/api-surface.md](references/api-surface.md) and [references/commons.md](references/commons.md).

## References

- [commons.md](references/commons.md)
- [common-use-cases.md](references/common-use-cases.md)
- [troubleshooting-workarounds.md](references/troubleshooting-workarounds.md)
- [normalize-for-web.md](references/normalize-for-web.md)
- [examples.md](references/examples.md)
