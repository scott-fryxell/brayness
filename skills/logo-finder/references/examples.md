# Examples

## Happy path - one integration logo

```bash
bash skills/logo-finder/scripts/logo.sh Figma public/brands/figma.svg
```

```html
<img src="/brands/figma.svg" alt="" width="24" height="24" />
<strong>Figma</strong>
```

## SVGL miss - Commons (DaVinci Resolve)

SVGL often has no Resolve entry. Use the manifest row sourced from [Commons](https://commons.wikimedia.org/wiki/File:DaVinci_Resolve_17_logo.svg):

```bash
bash skills/logo-finder/scripts/commons.sh "DaVinci Resolve" public/brands/davinci-resolve.svg
```

## Fill gaps in an existing page

Read the target file, find logo references that are empty or use a placeholder icon, then feed those names to `batch.sh` or `logo.sh`. There is no format-specific script - read the markup yourself.

## Batch a brand list

`examples/sample-brands.txt`:

```
Illustrator
Figma
Photoshop
After Effects
Premiere Pro
Blender
Unreal Engine
Unity
DaVinci Resolve
Final Cut Pro
Affinity Designer
Affinity Photo
Inkscape
Procreate
Canva
```

```bash
bash skills/logo-finder/scripts/batch.sh skills/logo-finder/examples/sample-brands.txt public/brands
```

## Anti-pattern - hotlink SVGL in production

```html
<!-- BAD: runtime dependency + rate limits -->
<img src="https://svgl.app/library/figma.svg" alt="Figma" />
```

## Corrected - vendored asset

```bash
bash skills/logo-finder/scripts/logo.sh Figma public/brands/figma.svg
```

```html
<img src="/brands/figma.svg" alt="" />
```

## Anti-pattern - stack every search result

Fetching all JSON matches and showing 5 Adobe icons for one "Illustrator" line.

## Corrected - one mark per integration line

Use `logo.sh` match rules or exact title from `--search`.
