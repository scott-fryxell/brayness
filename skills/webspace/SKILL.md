---
name: webspace
description: >-
  Build a static site from a folder of markdown. Use when a session is asked to
  publish notes, plans, or docs as pages someone can open at a URL - "build a
  site from this folder", "publish these notes", "turn these markdown files into
  pages", "make the plans browsable". Renders with comark and shiki, the same
  pipeline as the brayness plans viewer, and writes plain HTML that needs no
  server of its own.
metadata:
  category: Content
  tags:
    - markdown
    - static-site
    - publish
---

# Webspace

Turn a folder of markdown into pages. One command, no build config:

```bash
node /opt/brayness/skills/webspace/build.js --in /root/notes --out /root/site --title "Notes"
```

- Every top-level `.md` in `--in` becomes `<slug>.html`, plus an `index.html`
  listing them and a `style.css` copied beside them.
- Frontmatter is stripped; the first `h1` is the page title, the first
  paragraph is the description.
- Fenced code is highlighted with shiki. Mermaid fences become diagrams in the
  browser, drawn from `/mermaid.min.js`, which the host serves - so a page
  opened straight off the disk shows the diagram source instead.
- Relative links mean the folder works anywhere it is served from.

The output is a plain directory: it holds nothing but `.html` and `.css`, and
it is what the host publishes for a URL.

## What it does not do

- No live reload, no server, no watching. Build is a step, not a process.
- No nested folders: only the top level of `--in` is read.
- No mermaid rendering offline. The bundle is not copied into the output.
