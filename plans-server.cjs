#!/usr/bin/env node
// Serve plans/ as rendered HTML, live. comark -> @comark/html -> shiki, the
// same pipeline as work/blog/build.js. Renders per request, so nothing is
// pre-built and a saved markdown file shows up on the next reload.
//
//   node plans-server.cjs              # serve the index, print the URL
//   node plans-server.cjs <name>       # serve and open that plan
//
// Dependencies resolve from work/blog/node_modules - the blog owns them.
// See package.json's "plans" script for the NODE_PATH line.

const { render } = require("@comark/html")
const { codeToHtml } = require("shiki")
const { readdir, readFile } = require("fs/promises")
const { basename, join } = require("path")
const { createServer } = require("http")
const { watch, readFileSync } = require("fs")
const { execFile } = require("child_process")

const PLANS = 'plans'
// The same stylesheet the webspace skill ships to a session: one file, so the
// dev viewer and a published site cannot drift apart.
const STYLESHEET = join(__dirname, 'skills/webspace/viewer.css')
const MERMAID = join(__dirname, 'work/blog/node_modules/mermaid/dist/mermaid.min.js')
const PORT = Number(process.env.PLANS_PORT || 3100)

// Matches a fenced code block comark emits - `<pre language="js"><code
// class="language-js">` in 0.4.0, `<pre><code class="language-js">` before that -
// so the attributes on pre are optional. Mirrors the webspace skill's builder.
const code_block = /<pre(?:\s+[^>]*)?><code(?:\s+class="language-([^"]*)"[^>]*)?>([\s\S]*?)<\/code><\/pre>/g
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }

let stamp = Date.now()

function strip_frontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return text
  const end = text.indexOf('\n---', 4)
  if (end === -1) return text
  return text.slice(end + 4).replace(/^\r?\n/, '')
}

async function highlight(html) {
  // Mermaid fences are left exactly as comark emits them: mermaid_setup looks
  // for `pre[language="mermaid"] > code` and shiki would replace that element
  // with its own, taking the diagram source with it.
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

// A plan's page title: its first h1, falling back to the filename. Read from
// the rendered HTML so it matches what the page actually shows.
function page_title(html, slug) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  if (!match) return slug
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function page_description(html) {
  const match = html.match(/<p>([\s\S]{10,300}?)<\/p>/)
  if (!match) return 'Brayness plans'
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
}

function slug_from_file(name) {
  return basename(name, '.md').replace(/[^a-zA-Z0-9_-]/g, '-')
}

// Watch mode only: keeps the open tab honest. Pulled from work/blog/build.js -
// fetch is blocked over file://, which is why this needs a server at all.
const live_reload = `<script>
let stamp = null
setInterval(async () => {
  const next = await fetch('/stamp.txt', { cache: 'no-store' })
    .then(response => response.text())
    .catch(() => null)
  if (!next) return
  if (stamp && next !== stamp) location.reload()
  stamp = next
}, 400)
</script>`

// comark emits a mermaid fence as <pre language="mermaid"><code
// class="language-mermaid"> with the diagram escaped. Mermaid wants the raw
// text, so decode the entities and swap the block for a div it can draw into.
// Runs before the mermaid bundle loads (script order below), and mermaid
// re-reads the DOM on start.
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
  const description = opts.description || 'Brayness plans'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="darkreader-lock">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main>
<nav aria-label="Plans"><a href="/">plans</a></nav>
<article>
${body}
</article>
<footer>
<p>Rendered from <code>plans/${opts.filename || ''}</code> with comark and shiki. <a href="/">All plans</a></p>
</footer>
</main>
${mermaid_setup}
<script src="/mermaid.min.js"></script>
${mermaid_boot}
${live_reload}
</body>
</html>`
}

async function plan_files() {
  const entries = await readdir(join(__dirname, PLANS), { withFileTypes: true })
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => e.name)
    .sort()
}

async function render_plan(filename) {
  const raw = await readFile(join(__dirname, PLANS, filename), 'utf8')
  const rendered = await render(strip_frontmatter(raw))
  const highlighted = await highlight(rendered)
  return {
    html: highlighted,
    title: page_title(highlighted, filename),
    description: page_description(highlighted),
    slug: slug_from_file(filename)
  }
}

async function index_page() {
  const files = await plan_files()
  const plans = await Promise.all(files.map(render_plan))
  const items = plans
    .map(plan => `<li><a href="/${plan.slug}"><strong>${plan.title}</strong></a> <span>${plan.description}</span></li>`)
    .join('\n')

  return shell('Plans', `<h1>Plans</h1>
<p>Every <code>plans/*.md</code> rendered with comark and shiki. Save a file and this page reloads.</p>
<ol>${items}</ol>`, { description: `${plans.length} plans from plans/` })
}

// Routes a request to a plan filename. Exact slug match only - a guess that
// silently opens the wrong plan is worse than a 404.
async function resolve_plan(name) {
  const wanted = slug_from_file(name)
  const files = await plan_files()
  return files.find(file => slug_from_file(file) === wanted) || null
}

const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)

  try {
    if (path === '/style.css') {
      response.writeHead(200, {
        'content-type': 'text/css; charset=utf-8',
        'cache-control': 'no-store'
      })
      return response.end(await readFile(STYLESHEET))
    }

    if (path === '/mermaid.min.js') {
      response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
      return response.end(await readFile(MERMAID))
    }

    if (path === '/stamp.txt') {
      response.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' })
      return response.end(String(stamp))
    }

    if (path === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return response.end(await index_page())
    }

    const file = await resolve_plan(path.slice(1))
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      return response.end(shell('Not found', `<h1>No plan by that name</h1>
<p><code>${path.slice(1)}</code> is not a plan. <a href="/">See all plans</a>.</p>`))
    }

    const plan = await render_plan(file)
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(shell(plan.title, plan.html, { description: plan.description, filename: file }))
  } catch (error) {
    console.error(error)
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(error.message)
  }
})

function open_browser(url) {
  // macOS: hand the URL to the default browser. Silently no-ops elsewhere.
  if (process.platform !== 'darwin') return
  execFile('open', [url], error => { if (error) console.error(error.message) })
}

function watch_plans() {
  let pending = null
  watch(join(__dirname, PLANS), { recursive: true }, () => {
    clearTimeout(pending)
    pending = setTimeout(() => {
      stamp = Date.now()
      console.log('plans changed')
    }, 50)
  })
}

async function main() {
  const [name] = process.argv.slice(2)

  if (name) {
    const file = await resolve_plan(name)
    if (!file) {
      console.error(`No plan named "${name}". Try: ls plans/`)
      process.exit(1)
    }
  }

  watch_plans()
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is taken - another viewer is probably running. Stop it, or set PLANS_PORT.`)
      process.exit(1)
    }
    throw error
  })

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}${name ? `/${slug_from_file(name)}` : ''}`
    console.log(url)
    if (name) open_browser(url)
  })
}

main()
