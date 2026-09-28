#!/usr/bin/env node
//
// Turn a folder of images and videos into realness posters.
//
//   npm run make:posters <folder> [--workers N] [--dry-run]
//
// Images trace directly; videos trace one frame a quarter of the way in;
// everything else gets a record with no poster. Sources are read and never
// written. An evicted iCloud file is downloaded, traced, and evicted again,
// so a library far bigger than the free disk still fits.
//
// Output lands in artifacts/posters/<folder>/ at the brayness root: one svg
// and one json record per source, mirroring the folder, plus posters.json
// with every record. The svgs are the master, so a rerun only traces what is
// missing.

import { spawnSync, fork } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { gzipSync } from 'node:zlib'
import { chrome_path, data_url_of, open_driver, trace } from './lib/poster-driver.js'
import { list_sources, poster_paths_for, slices_of } from './lib/sources.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __filename = fileURLToPath(import.meta.url)
const brayness_root = path.join(__dirname, '..')

const DEFAULT_WORKERS = 4
// make-animation uses 9335 up, the realness poster script 9334.
const DEBUG_PORT = 9340
const WORKER_FLAG = '--worker'
// Big originals go down to this long side before tracing; the poster has no
// resolution of its own, and a 40 MB data url only slows the page.
const MAX_TRACE_SIDE = 2048
const PRESCALE_OVER_BYTES = 8 * 1024 * 1024
const FRAME_AT = 0.25
// Never let a download take the disk below this.
const DISK_RESERVE_BYTES = 2 * 1024 * 1024 * 1024
const DOWNLOAD_POLL_MS = 1000
const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1000
const SIGINT_EXIT = 130
const SIGTERM_EXIT = 143

const status = message => console.info(`make-posters: ${message}`)
const fail = message => {
  console.error(`make-posters: ${message}`)
  process.exit(1)
}

// ---- iCloud: evicted files hold no bytes until downloaded ----

const is_darwin = process.platform === 'darwin'

/** @param {string} file */
const is_evicted = file => {
  if (!is_darwin) return false
  const out = spawnSync('stat', ['-f', '%Sf', file], { encoding: 'utf8' })
  return out.stdout.includes('dataless')
}

const free_bytes = dir => {
  const { bavail, bsize } = fs.statfsSync(dir)
  return bavail * bsize
}

/** Download an evicted file and wait until its bytes are on disk. */
const make_local = async file => {
  const need = fs.statSync(file).size + DISK_RESERVE_BYTES
  if (free_bytes(path.dirname(file)) < need)
    throw new Error('not enough free disk to download it')
  spawnSync('brctl', ['download', file])
  const deadline = Date.now() + DOWNLOAD_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (!is_evicted(file)) return
    await new Promise(resolve => setTimeout(resolve, DOWNLOAD_POLL_MS))
  }
  throw new Error('download timed out')
}

const evict = file => spawnSync('brctl', ['evict', file])

// ---- sources to traceable images ----

const sha256_of = file =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    fs.createReadStream(file)
      .on('data', chunk => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })

const run = (cmd, args) => {
  const out = spawnSync(cmd, args, { encoding: 'utf8' })
  if (out.status !== 0)
    throw new Error(`${cmd} failed: ${(out.stderr || '').trim().split('\n').pop()}`)
  return out.stdout
}

/** One frame a quarter of the way in, as a png in scratch. */
const video_frame = (file, scratch) => {
  const duration = Number(
    run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file
    ]).trim()
  )
  const at = Number.isFinite(duration) ? duration * FRAME_AT : 0
  const out = path.join(scratch, 'frame.png')
  run('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    String(at),
    '-i',
    file,
    '-frames:v',
    '1',
    '-vf',
    `scale='min(${MAX_TRACE_SIDE},iw)':-2`,
    out
  ])
  return out
}

/** The image to hand the tracer: the original, or a smaller copy of it. */
const traceable_image = (source, scratch) => {
  if (source.kind === 'video') return video_frame(source.abs, scratch)
  if (!is_darwin || fs.statSync(source.abs).size <= PRESCALE_OVER_BYTES)
    return source.abs
  const out = path.join(scratch, `scaled${path.extname(source.abs)}`)
  run('sips', ['-Z', String(MAX_TRACE_SIDE), source.abs, '--out', out])
  return out
}

// ---- Worker: one headless browser, a slice of sources ----

const run_worker = async ({ out_root, sources, debug_port, worker_id }) => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'make-posters-'))
  let driver = null
  const cleanup = () => {
    driver?.shutdown()
    rmSync(scratch, { recursive: true, force: true })
  }
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.once(sig, () => {
      cleanup()
      process.exit(sig === 'SIGINT' ? SIGINT_EXIT : SIGTERM_EXIT)
    })

  try {
    for (const [index, source] of sources.entries()) {
      const where = poster_paths_for(out_root, source.rel)
      if (is_done(where.record)) continue
      const label = `${index + 1}/${sources.length} (worker ${worker_id}) ${source.rel}`
      const started = Date.now()
      const was_evicted = is_evicted(source.abs)
      const record = {
        source: source.rel,
        kind: source.kind,
        bytes: fs.statSync(source.abs).size,
        evicted: was_evicted,
        sha256: null,
        poster: null,
        svg_bytes: null,
        gzip_bytes: null,
        viewbox: null,
        seconds: null,
        problem: null
      }
      try {
        if (was_evicted) await make_local(source.abs)
        record.sha256 = await sha256_of(source.abs)
        if (source.kind !== 'other') {
          driver ??= await open_driver({ debug_port, name: 'make-posters' })
          status(`tracing ${label}`)
          const image = traceable_image(source, scratch)
          const { svg } = await trace(driver.evaluate, data_url_of(image), {
            label: source.rel,
            want_png: false,
            status
          })
          fs.mkdirSync(path.dirname(where.svg), { recursive: true })
          fs.writeFileSync(where.svg, svg)
          record.poster = path.relative(out_root, where.svg)
          record.svg_bytes = Buffer.byteLength(svg)
          record.gzip_bytes = gzipSync(svg, { level: 9 }).length
          record.viewbox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? null
        }
      } catch (error) {
        record.problem = error.message
        status(`skipped ${label}: ${error.message}`)
      } finally {
        // Leave the library the way we found it.
        if (was_evicted && !is_evicted(source.abs)) evict(source.abs)
      }
      record.seconds = Math.round((Date.now() - started) / 100) / 10
      fs.mkdirSync(path.dirname(where.record), { recursive: true })
      fs.writeFileSync(where.record, `${JSON.stringify(record, null, 2)}\n`)
    }
  } finally {
    cleanup()
  }
}

// ---- Master: list, fork workers, gather records ----

/** A source is done once its record exists without a problem to retry. */
const is_done = record_file => {
  if (!fs.existsSync(record_file)) return false
  return !JSON.parse(fs.readFileSync(record_file, 'utf8')).problem
}

const summarize = sources => {
  const by_kind = {}
  for (const source of sources) {
    const stat = fs.statSync(source.abs)
    const entry = (by_kind[source.kind] ??= { files: 0, bytes: 0, evicted: 0 })
    entry.files += 1
    entry.bytes += stat.size
    if (is_evicted(source.abs)) entry.evicted += 1
  }
  return by_kind
}

const run_master = async (folder, { workers, dry_run }) => {
  const root = path.resolve(folder)
  const out_root = path.join(brayness_root, 'artifacts', 'posters', path.basename(root))
  const sources = list_sources(root)
  if (!sources.length) fail(`no files under ${root}`)
  status(`${sources.length} files under ${root}`)
  status(JSON.stringify(summarize(sources)))
  if (dry_run) return

  const todo = sources.filter(
    source => !is_done(poster_paths_for(out_root, source.rel).record)
  )
  if (todo.length < sources.length)
    status(`resuming - ${sources.length - todo.length} already done`)
  fs.mkdirSync(out_root, { recursive: true })

  // Records only, no browser: nothing traceable is left to do.
  const traceable = todo.filter(source => source.kind !== 'other')
  const slices = slices_of(todo, traceable.length ? workers : 1)
  const children = (todo.length ? slices : []).map((slice, worker_id) =>
    fork(
      __filename,
      [
        WORKER_FLAG,
        JSON.stringify({
          out_root,
          sources: slice,
          debug_port: DEBUG_PORT + worker_id,
          worker_id
        })
      ],
      { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] }
    )
  )
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.once(sig, () => {
      for (const child of children) child.kill(sig)
      process.exit(sig === 'SIGINT' ? SIGINT_EXIT : SIGTERM_EXIT)
    })
  const codes = await Promise.all(
    children.map(child => new Promise(resolve => child.on('exit', resolve)))
  )

  const records = sources
    .map(source => poster_paths_for(out_root, source.rel).record)
    .filter(file => fs.existsSync(file))
    .map(file => JSON.parse(fs.readFileSync(file, 'utf8')))
  fs.writeFileSync(
    path.join(out_root, 'posters.json'),
    `${JSON.stringify(records, null, 2)}\n`
  )
  const traced = records.filter(record => record.poster)
  const problems = records.filter(record => record.problem)
  const sum = key => traced.reduce((total, record) => total + record[key], 0)
  status(
    `${traced.length} posters, ${problems.length} problems, sources ${Math.round(records.reduce((t, r) => t + r.bytes, 0) / 1024)} KB, svg ${Math.round(sum('svg_bytes') / 1024)} KB, gzip ${Math.round(sum('gzip_bytes') / 1024)} KB`
  )
  status(`wrote ${path.join(out_root, 'posters.json')}`)
  if (codes.some(code => code !== 0)) fail(`a worker failed (codes ${codes.join(',')})`)
}

// ---- CLI ----

const [, , first, second] = process.argv
if (first === WORKER_FLAG)
  run_worker(JSON.parse(second))
    .then(() => process.exit(0))
    .catch(error => {
      console.error(`make-posters: worker ${error.message}`)
      process.exit(1)
    })
else {
  const rest = process.argv.slice(3)
  let workers = DEFAULT_WORKERS
  const index = rest.indexOf('--workers')
  if (index >= 0) {
    const n = Number(rest[index + 1])
    if (Number.isInteger(n) && n > 0) workers = n
  }
  if (!first || first.startsWith('--'))
    fail('usage: npm run make:posters <folder> [--workers N] [--dry-run]')
  if (!fs.existsSync(first)) fail(`folder not found: ${first}`)
  if (!chrome_path) fail('no Chromium browser found - set CHROME_PATH')
  run_master(first, { workers, dry_run: rest.includes('--dry-run') })
    .then(() => process.exit(0))
    .catch(error => fail(error.message))
}
