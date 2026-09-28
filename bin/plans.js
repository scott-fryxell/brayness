#!/usr/bin/env node
// Render plans/ with the static example (brayness-examples/static).
//
//   npm run plans           serve on http://localhost:3100, rebuilding on save
//   npm run plans:build     build once into artifacts/plans-site/dist
//
// First run downloads the example into artifacts/plans-site and installs it.
// Delete that folder to pick up a newer example. PLANS_EXAMPLE=<dir> copies a
// local checkout instead of downloading.
import { execFileSync, spawn } from "node:child_process"
import { appendFileSync, cpSync, existsSync, readFileSync, rmSync, symlinkSync, watch, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SITE = join(ROOT, "artifacts/plans-site")
const EXAMPLE = "gh:scott-fryxell/brayness-examples/static"
const MARK = "/* plans: finished nodes */"
// Plan conventions: a finished node is ~~id~~ in the table; dim its row.
const PLAN_CSS = `
${MARK}
tr:has(del) {
  opacity: 0.45;
}

tr:has(del) del {
  text-decoration: none;
}
`

// A plan has no poster; its first DAG takes the card's image slot. Runs
// before scripts/diagrams.js, so the copy is drawn with the rest.
const COVERS = `// plans: the first diagram becomes the cover
for (const figure of document.querySelectorAll('summary figure')) {
  if (figure.querySelector('img, pre.mermaid')) continue
  const article = figure.closest('article')
  const diagram = article?.querySelector('pre.mermaid')
  if (diagram) figure.prepend(diagram.cloneNode(true))
}
`
const COVER_CSS = `
/* plans: covers */
figure:has(> pre.mermaid) {
  height: auto;
  grid-template-rows: auto auto;
}

figure > pre.mermaid {
  grid-area: 1 / 1;
  margin: 0;
  padding: var(--base-line);
  max-height: min(56.25vw, 72dvh);
  display: flex;
  justify-content: center;
  overflow: hidden;
  background: none;
}

figure > pre.mermaid svg {
  max-width: 100%;
  max-height: calc(min(56.25vw, 72dvh) - var(--base-line) * 2);
}

/* the title sits under the diagram, not over it */
figure:has(> pre.mermaid) figcaption {
  grid-area: 2 / 1;
  background: none;
  color: inherit;
}

/* open, the body has the same diagram */
details[open] > summary figure > pre.mermaid {
  display: none;
}

/* with no poster beside it, the close mark stays right */
details[open] > summary figure:not(:has(img)) figcaption::after {
  left: auto;
  right: var(--base-line);
}

article[itemscope] > figure:not(:has(img)) .back-link {
  left: auto;
  right: var(--base-line);
}

/* a plan's DAG in the body fills the screen, not the text column */
section pre.mermaid {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  padding-inline: var(--base-line);
  box-sizing: border-box;
  background: none;
}

section pre.mermaid svg {
  display: block;
  width: 100%;
  max-width: none !important;
  height: auto;
  max-height: 100dvh;
  margin-inline: auto;
}

/* the node table breaks out of the text column, capped at 80rem */
section[itemprop="articleBody"] table {
  width: min(100vw - var(--base-line) * 2, 80rem);
  margin-inline: calc(50% - min(50vw - var(--base-line), 40rem));
}

/* no picture and no diagram: just the title bar */
figure:not(:has(img, pre.mermaid)) {
  height: auto;
}
`

const run = (command, args, cwd = SITE) => execFileSync(command, args, { cwd, stdio: "inherit" })

function setup() {
  // Covers need site.json "head", added to the example in September 2026
  const engine = join(SITE, "build.js")
  if (existsSync(engine) && !readFileSync(engine, "utf8").includes("site.head")) rmSync(SITE, { recursive: true, force: true })
  if (!existsSync(join(SITE, "package.json"))) {
    rmSync(SITE, { recursive: true, force: true })
    const local = process.env.PLANS_EXAMPLE
    if (local) {
      cpSync(resolve(local), SITE, {
        recursive: true,
        filter: (path) => !/\/(node_modules|dist)(\/|$)/.test(path),
      })
    } else {
      run("npx", ["-y", "giget", EXAMPLE, SITE], ROOT)
    }
  }
  if (!existsSync(join(SITE, "node_modules"))) run("npm", ["install", "--no-fund", "--no-audit"])

  // Every plan is an article: plans/brayness.md builds to /blog/brayness.
  const articles = join(SITE, "content/articles")
  rmSync(articles, { recursive: true, force: true })
  symlinkSync(join(ROOT, "plans"), articles)

  const site_json = join(SITE, "site.json")
  const site = JSON.parse(readFileSync(site_json, "utf8"))
  writeFileSync(
    site_json,
    JSON.stringify(
      {
        ...site,
        name: "Plans",
        tagline: "Brayness plans",
        url: "http://localhost:3100",
        head: '<script type="module" src="/scripts/covers.js"></script>',
      },
      null,
      2,
    ) + "\n",
  )

  const header = join(SITE, "partials/header.html")
  writeFileSync(
    header,
    readFileSync(header, "utf8")
      .replace("Your Name", "Plans")
      .replace("What you do", "Brayness plans"),
  )

  const style = join(SITE, "static/style.css")
  const css = readFileSync(style, "utf8")
  if (!css.includes(MARK)) appendFileSync(style, PLAN_CSS)
  const at = css.indexOf("/* plans: covers */")
  writeFileSync(style, (at < 0 ? readFileSync(style, "utf8") : css.slice(0, at)).trimEnd() + "\n" + COVER_CSS)
  writeFileSync(join(SITE, "static/scripts/covers.js"), COVERS)
}

setup()
if (process.argv.includes("--build")) {
  run(process.execPath, ["build.js", "--drafts"])
} else {
  const server = spawn(process.execPath, ["serve.js"], {
    cwd: SITE,
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.PLANS_PORT || "3100" },
  })
  server.on("exit", (code) => process.exit(code ?? 0))
  // The example's watcher does not follow the plans/ symlink; rewriting
  // site.json, which it does watch, triggers the rebuild.
  const site_json = join(SITE, "site.json")
  watch(join(ROOT, "plans"), () => writeFileSync(site_json, readFileSync(site_json)))
}
