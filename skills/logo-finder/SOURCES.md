# Sources

| Source                  | URL                                                                 | Used for                                            |
| ----------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| SVGL site               | https://svgl.app/                                                   | Product context                                     |
| API reference           | https://svgl.app/docs/api                                           | Endpoints, types, limits                            |
| GitHub README           | https://github.com/pheralb/svgl                                     | Data model, contribution rules                      |
| Live API probes         | `api.svgl.app`                                                      | Verified search + `/svg/{file}` behavior            |
| Wikimedia Commons       | https://commons.wikimedia.org/                                      | Curated SVG fallbacks in `assets/commons-logos.tsv` |
| DaVinci Resolve 17 logo | https://commons.wikimedia.org/wiki/File:DaVinci_Resolve_17_logo.svg | First commons row; PD textlogo + trademark notice   |

Changelog:

- 2026-06-03: Commons manifest, `commons.sh`, DaVinci + Inkscape rows
- 2026-06-29: Generalized - removed `missing-from-about.sh` (format-specific), moved brand list to `examples/sample-brands.txt`, made output dir explicit and framework-aware, no longer hardcoded to `work/web`
- 2026-06-02: Initial skill - search, fetch script, batch, Realness integrations list
