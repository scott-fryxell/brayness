# Common use cases

## 1. Integration row on a landing page

Brand list: build one from the page you are wiring, or start from `skills/logo-finder/examples/sample-brands.txt`.

```bash
bash skills/logo-finder/scripts/batch.sh \
  skills/logo-finder/examples/sample-brands.txt \
  public/brands
```

Markup (static paths, product name visible beside the logo):

```html
<img src="/brands/figma.svg" alt="" width="24" height="24" />
<strong>Figma</strong>
```

Empty `alt` when the product name is visible beside the logo.

## 2. One-off fetch

```bash
bash skills/logo-finder/scripts/logo.sh Canva public/brands/canva.svg
```

## 3. Inspect before save

```bash
bash skills/logo-finder/scripts/logo.sh "Premiere Pro" --search
```

## 4. Commit for deploy

```bash
git add public/brands/
```

Files must be in git or production 404s on `/brands/*.svg`.

## 5. Verify locally

With dev server running, visit `http://localhost:5173/brands/canva.svg` (or your framework's served prefix).

## 6. Refresh one logo

Re-run `logo.sh` to the same path; commit the diff.

## 7. Slug map

| Display name      | File slug           |
| ----------------- | ------------------- |
| Premiere Pro      | `premiere-pro`      |
| After Effects     | `after-effects`     |
| Unreal Engine     | `unreal-engine`     |
| Affinity Designer | `affinity-designer` |
| Affinity Photo    | `affinity-photo`    |
