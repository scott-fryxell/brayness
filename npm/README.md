# Add-on storage

You are inside pi's **add-on cupboard**.

This folder is not the npm program. pi names it `npm/` because add-ons are downloaded with npm.

| | Folder |
| --- | --- |
| The app (pi) | `../node_modules/` |
| The add-ons | `node_modules/` here |

Update add-ons from the repo root:

```bash
./bin/pi update --extensions
```

Do not edit `node_modules/` by hand. Full explanation: `../README.md`
