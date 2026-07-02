# Wikimedia Commons fallback

Use when [SVGL](https://svgl.app/) has no match (common for DaVinci Resolve, Inkscape, Apple tools).

## Curated manifest

`assets/commons-logos.tsv` - tab-separated rows:

| Column       | Example                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| slug         | `davinci-resolve`                                                                 |
| upload_url   | `https://upload.wikimedia.org/wikipedia/commons/9/90/DaVinci_Resolve_17_logo.svg` |
| commons_wiki | `https://commons.wikimedia.org/wiki/File:DaVinci_Resolve_17_logo.svg`             |
| product_name | `DaVinci Resolve` (must match the name you are wiring into your page)             |

Add a row after you verify license and trademark notes on the wiki page.

Example: [DaVinci Resolve 17 logo](https://commons.wikimedia.org/wiki/File:DaVinci_Resolve_17_logo.svg) (PD textlogo + trademark notice on Commons).

## Scripts

```bash
# By slug or product name
bash skills/logo-finder/scripts/commons.sh davinci-resolve public/brands/davinci-resolve.svg

# Direct upload URL (one-off)
bash skills/logo-finder/scripts/commons.sh --url 'https://upload.wikimedia.org/.../file.svg' public/brands/file.svg

# Search manifest only
bash skills/logo-finder/scripts/commons.sh --search davinci
```

To fill gaps in an existing page, read the markup, find empty/placeholder logo references, and run `logo.sh` then `commons.sh` for each missing name.

## Finding new files on Commons

1. Open https://commons.wikimedia.org and search `{Product} logo`.
2. Prefer **SVG** over PNG/JPG. If only PNG exists (common for Apple app icons), save as `{slug}.png` and wire that path in your page.
3. Resolve upload URL via API:

```bash
curl -fsSL 'https://commons.wikimedia.org/w/api.php?action=query&titles=File:DaVinci_Resolve_17_logo.svg&prop=imageinfo&iiprop=url&format=json' \
  | jq -r '.query.pages[].imageinfo[0].url'
```

4. Add row to `commons-logos.tsv`, run `commons.sh`, wire `<img src="/brands/{slug}.svg">` into your page.

## Limits

- **Final Cut Pro**: no SVG on Commons; use [File:FinalCutProACS2026.png](https://commons.wikimedia.org/wiki/File:FinalCutProACS2026.png) (Apple Creator Studio icon, linked from [Wikipedia](https://en.wikipedia.org/wiki/Final_Cut_Pro#/media/File:FinalCutProACS2026.png)) as `final-cut-pro.png`.
- **Procreate**: use [File:Procreate icon.png](https://en.wikipedia.org/wiki/File:Procreate_icon.png) from the [Wikipedia](<https://en.wikipedia.org/wiki/Procreate_(software)>) infobox as `procreate.png` (no SVG on Commons). Official vectors: [procreate.com/brand-use](https://procreate.com/brand-use).
- Large SVGs (e.g. Resolve ~145 KB) are fine for `<img>`; avoid inlining in sprites without cleanup.
- Scripts add `xmlns` when missing (`normalize_svg` in `lib.sh`).
