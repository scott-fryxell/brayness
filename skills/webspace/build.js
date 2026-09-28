#!/usr/bin/env node
// Build a static site from a folder of markdown: comark -> @comark/html ->
// shiki, the same pipeline as work/blog/build.js and plans-server.cjs.
//
//   node build.js --in <folder> --out <folder> [--title "Name"]
//
// Reads every top-level .md in --in, writes one HTML page per file plus an
// index and the stylesheet into --out. Nothing is served here: this is the
// step a session runs to produce a site it can publish. Mermaid diagrams are
// drawn by the browser from /mermaid.min.js, which the host serves.

import { render } from "@comark/html"
import { codeToHtml } from "shiki"
import { cp, mkdir, readdir, readFile, writeFile } from "fs/promises"
import { basename, join, resolve } from "path"
import { fileURLToPath } from "url"

const HERE = fileURLToPath(new URL(".", import.meta.url))
const STYLESHEET = join(HERE, "viewer.css")

// Matches a fenced code block comark emits - `<pre language="js"><code
// class="language-js">` in 0.4.0, `<pre><code class="language-js">` before that -
// so the attributes on pre are optional. Mirrors plans-server.cjs.
const code_block = /<pre(?:\s+[^>]*)?><code(?:\s+class="language-([^"]*)"[^>]*)?>([\s\S]*?)<\/code><\/pre>/g
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }

function usage(message) {
  if (message) console.error(message)
  console.error('usage: build.js --in <folder> --out <folder> [--title "Name"]')
  process.exit(2)
}

/** @returns {{ source: string, out: string, title: string }} */
function parse_args(argv) {
  const args = { source: null, out: null, title: "Notes" }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag === "--in") args.source = value
    else if (flag === "--out") args.out = value
    else if (flag === "--title") args.title = value
    else usage(`unknown argument: ${flag}`)
    i += 1
  }
  if (!args.source) usage("--in is required")
  if (!args.out) usage("--out is required")
  return { source: resolve(args.source), out: resolve(args.out), title: args.title }
}

function strip_frontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return text
  const end = text.indexOf('\n---', 4)
  if (end === -1) return text
  return text.slice(end + 4).replace(/^\r?\n/, '')
}

async function highlight(html) {
  // Mermaid fences are left exactly as comark emits them: the browser's setup
  // script looks for `pre[language="mermaid"] > code` and shiki would replace
  // that element with its own, taking the source with it.
  const blocks = [...html.matchAll(code_block)].filter(([, language]) => language !== 'mermaid')
  if (!blocks.length) return html
  const rendered = await Promise.all(
    blocks.map(([, language, code]) =>
      codeToHtml(code.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => entities[name] || name), {
        lang: language || 'text',
        themes: { light: 'one-light', dark: 'one-dark-pro' },
        defaultColor: false
      })
    )
  )
  return blocks.reduce((out, block, i) => out.replace(block[0], () => rendered[i]), html)
}

// The page title is the document's first h1, read from the rendered HTML so it
// matches what the page shows; the slug is the filename.
function page_title(html, slug) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  if (!match) return slug
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function page_description(html) {
  const match = html.match(/<p>([\s\S]{10,300}?)<\/p>/)
  if (!match) return ''
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
}

function slug_from_file(name) {
  return basename(name, '.md').replace(/[^a-zA-Z0-9_-]/g, '-')
}

// comark emits a mermaid fence as <pre language="mermaid"><code
// class="language-mermaid"> with the diagram escaped. Mermaid wants the raw
// text, so decode the entities and swap the block for a div it can draw into.
const mermaid_setup = `<script>
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }
document.querySelectorAll('pre[language="mermaid"] > code').forEach(code => {
  const source = code.textContent.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => entities[name])
  const target = document.createElement('div')
  target.className = 'mermaid'
  target.textContent = source
  code.parentElement.replaceWith(target)
})
</script>`

const mermaid_boot = `<script>
if (document.querySelector('.mermaid')) {
  // Mermaid's parser rejects oklch() and aborts the whole diagram, so these
  // are sRGB hex equivalents of viewer.css's materials (converted from the
  // oklch triads - keep them in step if the palette moves):
  //   basalt #2c2c26   chalk #ecebe4   bone #dbdbd4   graphite #525252
  //   water-lighten #74b9b9   water-darken #356e6e
  // It also has no theme that follows the OS preference, so pick by hand -
  // otherwise a light diagram sits on the dark page with invisible arrows.
  const dark = matchMedia('(prefers-color-scheme: dark)').matches
  const surface = dark ? '#2c2c26' : '#ecebe4'
  const text = dark ? '#dbdbd4' : '#525252'
  const line = dark ? '#74b9b9' : '#356e6e'

  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      fontFamily: '-apple-system, system-ui, sans-serif',
      fontSize: '16px',
      background: surface,
      primaryColor: surface,
      primaryTextColor: text,
      primaryBorderColor: line,
      lineColor: line,
      textColor: text,
      nodeBorder: line,
      clusterBkg: surface,
      clusterBorder: line
    },
    flowchart: { curve: 'basis', padding: 12 }
  })
}
</script>`

function shell(title, body, opts = {}) {
  const description = opts.description || ''
  const source = opts.filename ? `<p>Built from <code>${opts.filename}</code>. <a href="index.html">All pages</a></p>` : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="darkreader-lock">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="style.css">
</head>
<body>
<main>
<article>
${body}
</article>
<footer>
${source}
</footer>
</main>
${mermaid_setup}
<script src="/mermaid.min.js"></script>
${mermaid_boot}
</body>
</html>`
}

async function markdown_files(source) {
  let entries
  try {
    entries = await readdir(source, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') usage(`no such folder: ${source}`)
    throw error
  }
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name)
    .sort()
}

async function render_page(source, filename) {
  const raw = await readFile(join(source, filename), 'utf8')
  const html = await highlight(await render(strip_frontmatter(raw)))
  const slug = slug_from_file(filename)
  return { html, slug, title: page_title(html, slug), description: page_description(html) }
}

async function build(source, out, site_title) {
  const files = await markdown_files(source)
  if (!files.length) usage(`no .md files in ${source}`)

  const pages = []
  for (const filename of files) {
    const page = await render_page(source, filename)
    await writeFile(join(out, `${page.slug}.html`),
      shell(page.title, page.html, { description: page.description, filename }))
    pages.push(page)
  }

  const items = pages
    .map(page => `<li><a href="${page.slug}.html"><strong>${page.title}</strong></a>${page.description ? ` <span>${page.description}</span>` : ''}</li>`)
    .join('\n')

  await writeFile(join(out, 'index.html'), shell(site_title,
    `<h1>${site_title}</h1>\n<ol>${items}</ol>`, { description: `${pages.length} pages` }))

  await cp(STYLESHEET, join(out, 'style.css'))
  return pages
}

const { source, out, title } = parse_args(process.argv.slice(2))
await mkdir(out, { recursive: true })
const pages = await build(source, out, title)
console.log(`built ${pages.length} pages from ${source} into ${out}`)
for (const page of pages) console.log(`  ${page.slug}.html  ${page.title}`)
