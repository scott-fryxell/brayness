#!/usr/bin/env node
// Build browser-viewable HTML for all plans/ .md files using comark
// (same pipeline as work/blog/build.js: parse -> @comark/html render -> shiki highlight)
// Outputs to artifacts/plans/ so Claude / Codex can host / open as artifacts.

const { render } = require("@comark/html")
const { parse } = require("comark")
const { codeToHtml } = require("shiki")
const { readdir, readFile, writeFile, mkdir, cp } = require("fs/promises")
const { join, basename, dirname } = require("path")
const { existsSync } = require("fs")

const PLANS = 'plans'
const OUT = 'artifacts/plans'
const BLOG_STATIC = 'work/blog/static'

// Code block regex matching blog build.js (line ~186)
const code_block = /<pre><code(?:\s+class="language-([^"]+)"[^>]*)?>([\s\S]*?)<\/code><\/pre>/g

async function highlight(html) {
  const blocks = [...html.matchAll(code_block)]
  if (!blocks.length) return html
  const rendered = await Promise.all(
    blocks.map(([, language, code]) =>
      codeToHtml(code.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name] || name)), {
        lang: language || 'text',
        themes: { light: 'one-light', dark: 'one-dark-pro' },
        defaultColor: false
      })
    )
  )
  return blocks.reduce((out, block, i) => out.replace(block[0], () => rendered[i]), html)
}

function slug_from_path(p) {
  return basename(p, '.md').replace(/[^a-zA-Z0-9_-]/g, '-')
}

function strip_frontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return text
  const end = text.indexOf('\n---', 4)
  if (end === -1) return text
  return text.slice(end + 4).replace(/^\r?\n/, '')
}

function shell(title, body, opts = {}) {
  const full_title = opts.title_suffix ? `${title} — Plans` : `${title}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="darkreader-lock">
<title>${full_title}</title>
<meta name="description" content="Brayness plan — ${title}">
<link rel="stylesheet" href="style.css">
<style>
  /* Minimal overrides for standalone artifact pages */
  body { font-family: Georgia, "Times New Roman", serif; line-height: 1.55; color: #222; background: #fdfcf8; }
  main { max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; }
  h1 { font-family: system-ui, -apple-system, sans-serif; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; font-size: 2.2rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.35rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  a { color: #2b6cb0; text-decoration: underline; text-underline-offset: 0.15em; }
  pre { background: #f4f3ef; padding: 1rem; overflow-x: auto; border-radius: 6px; font-size: 0.85rem; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .plan-nav { font-family: system-ui, -apple-system, sans-serif; font-size: 0.9rem; margin-bottom: 2rem; }
  .plan-nav a { text-decoration: none; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.8rem; color: #777; font-family: system-ui, sans-serif; }
  @media (prefers-color-scheme: dark) {
    body { background: #181818; color: #eaeaea; }
    h1, h2 { color: #f2f2f2; border-bottom-color: #333; }
    a { color: #8ab4f8; }
    pre { background: #262626; }
    .plan-nav { color: #ccc; }
    footer { border-top-color: #333; color: #aaa; }
  }
</style>
</head>
<body>
<main>
  <nav class="plan-nav" aria-label="Plan navigation">
    <a href="index.html">← All plans</a>
  </nav>
  <article>
    ${body}
  </article>
  <footer><p>Rendered from <code>plans/${opts.filename || ''}</code> using comark + shiki. Generated ${new Date().toISOString().split('T')[0]}.</p></footer>
</main>
</body>
</html>`
}

async function build_index(files, out_dir) {
  // files: array of {slug, title, excerpt, path}
  const rows = files.map(f => {
    const safe_title = f.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<li><a href="${f.slug}.html"><strong>${safe_title}</strong></a> — <span style="color:#777;font-size:0.9rem">${(f.excerpt || '').slice(0, 120)}${(f.excerpt || '').length > 120 ? '...' : ''}</span></li>`
  }).join('\n')

  const body = `<h1>Brayness — Plans</h1>
<p>Browser-readable versions of <code>plans/*.md</code>, rendered with <strong>comark</strong> + <strong>shiki</strong> (same pipeline as the blog in <code>work/blog/</code>).</p>
<ul style="list-style:none;padding-left:0;line-height:1.8">${rows}</ul>
<p><small>Generated ${new Date().toISOString().split('T')[0]}. Open any link to view a plan; click “← All plans” to return.</small></p>`

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="darkreader-lock">
<title>Brayness — Plans</title>
<meta name="description" content="Browser-viewable plans from brayness/plans/ using comark.">
<link rel="stylesheet" href="style.css">
<style>
  body { font-family: Georgia, serif; line-height: 1.55; color: #222; background: #fdfcf8; }
  main { max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; }
  h1 { font-family: system-ui, sans-serif; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; font-size: 2.2rem; }
  a { color: #2b6cb0; text-decoration: underline; text-underline-offset: 0.15em; }
  ul { padding-left: 0; list-style: none; }
  li { border-bottom: 1px solid #eee; padding: 0.5rem 0; }
  footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.8rem; color: #777; font-family: system-ui, sans-serif; }
  @media (prefers-color-scheme: dark) {
    body { background: #181818; color: #eaeaea; }
    h1 { color: #f2f2f2; }
    a { color: #8ab4f8; }
    li { border-bottom-color: #333; }
    footer { border-top-color: #333; color: #aaa; }
  }
</style>
</head>
<body>
<main>
  <article>${body}</article>
  <footer><p>Rendered with comark / @comark/html + shiki from <code>plans/</code>. See <code>build-plans.js</code>.</p></footer>
</main>
</body>
</html>`

  await writeFile(join(out_dir, 'index.html'), html)
  console.log('Wrote index.html with', files.length, 'plans')
}

async function main() {
  await mkdir(OUT, { recursive: true })

  // Copy blog style.css so relative links work; fall back to embedded styles if missing
  if (existsSync(join(BLOG_STATIC, 'style.css'))) {
    await cp(join(BLOG_STATIC, 'style.css'), join(OUT, 'style.css'))
    console.log('Copied style.css from blog static')
  } else {
    console.log('No blog style.css found; using embedded styles')
  }

  const entries = await readdir(PLANS, { withFileTypes: true })
  const mdFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => join(PLANS, e.name))

  const indexEntries = []

  for (const file of mdFiles.sort()) {
    const raw = await readFile(file, 'utf8')
    const content = strip_frontmatter(raw)
    const slug = slug_from_path(file)
    const rendered = await render(content) // @comark/html direct render (async)
    const highlighted = await highlight(rendered)

    // Extract title from first h1 for index / shell
    const h1Match = highlighted.match(/<h1[^>]*>([^<]+)<\/h1>/)
    const title = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : slug

    // Excerpt: first paragraph after h1
    const pMatch = highlighted.match(/<p>([^<]{10,250})/)
    const excerpt = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    indexEntries.push({ slug, title, excerpt, path: file, filename: basename(file) })

    const html = shell(title, highlighted, { title_suffix: true, filename: basename(file) })
    const outPath = join(OUT, `${slug}.html`)
    await writeFile(outPath, html)
    console.log('Wrote', outPath)
  }

  await build_index(indexEntries, OUT)
  console.log('\nDone. Open artifacts/plans/index.html in a browser.')
  console.log('Files:', indexEntries.length, 'individual pages + index.html')
}

main().catch(err => { console.error(err); process.exit(1) })
