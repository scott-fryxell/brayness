#!/usr/bin/env node
//
// Render a folder of posters as a masonry gallery with the static example.
//
//   npm run gallery "artifacts/posters/Geoff Darrow"           serve on :3200
//   npm run gallery "artifacts/posters/Geoff Darrow" --build   build once
//
// The folder is make-posters output: svgs plus posters.json. Every poster
// becomes an article - the poster is its cover, the record its body - so the
// index is the gallery. First run downloads the example into
// artifacts/gallery-site and installs it; delete that folder to pick up a
// newer example.

import { execFileSync, spawn } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = join(ROOT, 'artifacts/gallery-site')
const EXAMPLE = 'gh:scott-fryxell/brayness-examples/static'
const PORT = process.env.GALLERY_PORT || '3200'
const MARK = '/* gallery: masonry */'

// The index is a column of 16:9 bands in the example; a gallery wants every
// poster whole, at its own shape, packed into columns.
const GALLERY_CSS = `
${MARK}
main > section:has(> article) {
  --gutter: 2px;
  columns: 28rem;
  column-gap: var(--gutter);
  padding: 0;
}
main > section > article {
  break-inside: avoid;
  border-bottom: 0;
  margin-bottom: var(--gutter);
}
main > section > article figure {
  height: auto;
}
main > section > article figure img {
  width: 100%;
  height: auto;
  object-fit: contain;
}
/* the index is all art: the title stays for screen readers, and a click
   opens the poster's page, where the text is */
main > section > article summary figcaption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
`

// A card is a <details>; in the gallery a click goes to the poster's page
// instead of opening the card in place.
const GALLERY_JS = `for (const summary of document.querySelectorAll('main > section > article summary')) {
  const link = summary.querySelector('a[itemprop="url"]')
  if (link)
    summary.addEventListener('click', event => {
      event.preventDefault()
      location.href = link.href
    })
}
`

const KB = 1024
const run = (command, args, cwd = SITE) =>
  execFileSync(command, args, { cwd, stdio: 'inherit' })

const fail = message => {
  console.error(`gallery: ${message}`)
  process.exit(1)
}

/** A url-safe name for a source path: `a/Big Photo.JPG` -> `a-big-photo-jpg`. */
const slug_of = source =>
  source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const yaml_string = value => JSON.stringify(String(value))

const setup = () => {
  if (!existsSync(join(SITE, 'package.json'))) {
    rmSync(SITE, { recursive: true, force: true })
    run('npx', ['-y', 'giget', EXAMPLE, SITE], ROOT)
  }
  if (!existsSync(join(SITE, 'node_modules')))
    run('npm', ['install', '--no-fund', '--no-audit'])
  // Rewrite the block every run, so a change here reaches the site.
  const style = join(SITE, 'static/style.css')
  const css = readFileSync(style, 'utf8')
  const at = css.indexOf(MARK)
  writeFileSync(style, `${(at < 0 ? css : css.slice(0, at)).trimEnd()}\n${GALLERY_CSS}`)
  writeFileSync(join(SITE, 'static/scripts/gallery.js'), GALLERY_JS)
}

const load = posters_dir => {
  const records_file = join(posters_dir, 'posters.json')
  if (!existsSync(records_file))
    fail(`no posters.json in ${posters_dir} - run npm run make:posters first`)
  return JSON.parse(readFileSync(records_file, 'utf8')).filter(record => record.poster)
}

const write_content = (posters_dir, records) => {
  const articles = join(SITE, 'content/articles')
  const posters = join(SITE, 'static/posters')
  rmSync(articles, { recursive: true, force: true })
  rmSync(posters, { recursive: true, force: true })
  mkdirSync(articles, { recursive: true })
  mkdirSync(posters, { recursive: true })
  for (const record of records) {
    const slug = slug_of(record.source)
    copyFileSync(join(posters_dir, record.poster), join(posters, `${slug}.svg`))
    const title = basename(record.source).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
    writeFileSync(
      join(articles, `${slug}.md`),
      `---
title: ${yaml_string(title)}
img: ${slug}.svg
description: ${yaml_string(record.source)}
---

${record.source} · ${Math.round(record.bytes / KB)} KB original · ${Math.round(record.gzip_bytes / KB)} KB poster gzipped · \`${record.sha256.slice(0, 12)}\`
`
    )
  }
  return records.length ? `${slug_of(records[0].source)}.svg` : undefined
}

const write_site = (name, cover) => {
  const site_json = join(SITE, 'site.json')
  const site = JSON.parse(readFileSync(site_json, 'utf8'))
  writeFileSync(
    site_json,
    `${JSON.stringify(
      {
        ...site,
        name,
        tagline: 'Posters from iCloud',
        url: `http://localhost:${PORT}`,
        poster: cover ?? site.poster,
        head: '<script type="module" src="/scripts/gallery.js"></script>'
      },
      null,
      2
    )}\n`
  )
  const header = join(SITE, 'partials/header.html')
  writeFileSync(
    header,
    readFileSync(header, 'utf8')
      .replace('Your Name', name)
      .replace('What you do', 'Posters from iCloud')
  )
}

const [, , folder] = process.argv
if (!folder || folder.startsWith('--'))
  fail('usage: npm run gallery <artifacts/posters/folder> [--build]')
const posters_dir = resolve(folder)
if (!existsSync(posters_dir)) fail(`not found: ${posters_dir}`)

setup()
const records = load(posters_dir)
write_site(basename(posters_dir), write_content(posters_dir, records))
console.info(`gallery: ${records.length} posters from ${posters_dir}`)

if (process.argv.includes('--build')) run(process.execPath, ['build.js', '--drafts'])
else {
  const server = spawn(process.execPath, ['serve.js'], {
    cwd: SITE,
    stdio: 'inherit',
    env: { ...process.env, PORT }
  })
  server.on('exit', code => process.exit(code ?? 0))
}
