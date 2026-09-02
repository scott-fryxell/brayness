#!/usr/bin/env node
//
// Turn a video into a realness poster animation.
//
//   npm run make:animation my-movie.mp4
//   npm run make:animation clip.mov --fps 12 --width 2000 --keep-frames
//
// Every frame is traced through the realness poster pipeline running in a
// headless browser, rastered, and encoded back into an mp4 with the original
// soundtrack. Node builtins, ffmpeg, and a Chromium browser - no npm packages,
// no checkout of realness, no local build.
//
// Output lands in artifacts/animation/ at the brayness root. The traced svgs
// are the master and stay behind, so a rerun resumes and a rerun at a
// different --width re-rasters without re-tracing.

import { spawn, fork } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __filename = fileURLToPath(import.meta.url)
const brayness_root = path.join(__dirname, '..')
const out_dir = path.join(brayness_root, 'artifacts', 'animation')

// Render against the deployed site so a render never depends on a local
// build, prerender, or wasm step being present and current. Override for a
// preview (e.g. REALNESS_URL=https://realness.local).
const base_url = process.env.REALNESS_URL || 'https://realness.online'
const DRIVER_ROUTE = '/poster-driver'
const READY_TIMEOUT_MS = 120000
const POLL_MS = 1000
const PROGRESS_TICK_MS = 500
const US_PER_SECOND = 1e6
const STATUS_PAD = 48
const RENDER_RETRIES = 3
const BROWSER_TIMEOUT_MS = 20000
const BROWSER_POLL_MS = 200
const DEBUG_PORT = 9335
const DEFAULT_FPS = 24
const DEFAULT_WORKERS = 6
const AUDIO_BITRATE = '192k'
// x264's own default. Traced posters are all hard edges, which cost a codec
// dearly, so a 4k render at 23 runs to hundreds of megabytes - raise this to
// trade sharpness at the boundaries for a smaller file.
const DEFAULT_CRF = 23
const CRF_MIN = 0
const CRF_MAX = 51
const BYTES_PER_MB = 1e6
const ERR_TAIL_LINES = 4
const PROFILE_RM_RETRIES = 5
const PROFILE_RM_DELAY_MS = 200
const SIGINT_EXIT = 130
const SIGTERM_EXIT = 143

const PNG_SIGNATURE = Buffer.from('\x89PNG\r\n\x1a\n', 'binary')
const CHUNK_TYPE_AT = 12
const CHUNK_TYPE_END = 16
const WIDTH_AT = 16
const HEIGHT_AT = 20
const IHDR_HEADER_BYTES = 24

const BROWSER_CANDIDATES = [
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(fs.existsSync)

const chrome_path =
  (process.env.CHROME_PATH &&
    fs.existsSync(process.env.CHROME_PATH) &&
    process.env.CHROME_PATH) ||
  BROWSER_CANDIDATES[0]

/**
 * Why a rendered poster frame cannot be kept, or null when it is usable.
 *
 * A poster whose symbol defs never mounted still exports a well-formed png and
 * svg - just an empty shell, with `use` hrefs pointing at symbols that were
 * never merged in. Traced paths are the proof the frame is real, so a pathless
 * frame is a failed render and not a frame to write.
 *
 * @param {{ png?: string, svg?: string }} [frame]
 * @returns {string | null}
 */
const frame_problem = ({ png, svg } = {}) => {
  if (!png) return 'produced no poster png'
  if (!svg) return 'produced no poster svg'
  if (!svg.includes('<path')) return 'traced no paths'
  return null
}

/**
 * The pixel size to rasterize a traced poster at. The svg is the master and
 * has no resolution of its own, so `target_width` picks any size off the same
 * geometry; zero keeps the width it was traced at.
 *
 * Dimensions come back even - libx264 with yuv420p rejects odd ones, and
 * rounding here beats padding a stray line of pixels on at encode time.
 *
 * @param {string} svg
 * @param {number} [target_width]
 * @returns {{ width: number, height: number } | null}
 */
const poster_raster_size = (svg, target_width = 0) => {
  const viewbox = /viewBox="([^"]+)"/.exec(svg ?? '')?.[1]
  if (!viewbox) return null
  const [, , traced_width, traced_height] = viewbox
    .trim()
    .split(/\s+/)
    .map(Number)
  if (!(traced_width > 0) || !(traced_height > 0)) return null
  const even = value => Math.round(value / 2) * 2
  const width = even(target_width > 0 ? target_width : traced_width)
  return { width, height: even((width * traced_height) / traced_width) }
}

/**
 * Read a png's dimensions from its IHDR chunk, which is always the first 24
 * bytes. Enough to tell whether a frame on disk was rastered at the size this
 * run wants, without reading a multi-megabyte file to find out.
 *
 * @param {Buffer} [buffer] - at least the first 24 bytes of the file
 * @returns {{ width: number, height: number } | null}
 */
const read_png_size = buffer => {
  if (!buffer || buffer.length < IHDR_HEADER_BYTES) return null
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE))
    return null
  if (buffer.toString('ascii', CHUNK_TYPE_AT, CHUNK_TYPE_END) !== 'IHDR')
    return null
  return {
    width: buffer.readUInt32BE(WIDTH_AT),
    height: buffer.readUInt32BE(HEIGHT_AT)
  }
}

/**
 * Drop the rastered pngs from a frame directory, leaving the traced svgs.
 *
 * The pngs are scratch: the svgs beside them are the master and re-raster at
 * any width without re-tracing, so a finished encode has no reason to keep
 * gigabytes of them. Only `.png` is touched - everything else stays.
 *
 * @param {string} poster_dir
 * @returns {{ count: number, bytes: number }}
 */
const clear_raster_frames = poster_dir => {
  const frames = fs
    .readdirSync(poster_dir)
    .filter(name => name.endsWith('.png'))
    .map(name => path.join(poster_dir, name))
  const bytes = frames.reduce((total, file) => total + fs.statSync(file).size, 0)
  for (const file of frames) fs.rmSync(file)
  return { count: frames.length, bytes }
}

const fail = message => {
  console.error(`make-animation: ${message}`)
  process.exit(1)
}

// ---- CLI ----
const [, , arg_one, arg_two] = process.argv
const WORKER_FLAG = '--worker'
let worker_opts = null
let input_path = null
let fps = DEFAULT_FPS
let workers = DEFAULT_WORKERS
// Zero means "the size the poster was traced at". The traced svg is the master
// and carries no resolution of its own, so any width rasterizes from the same
// geometry - sharper edges, not more detail.
let width = 0
let crf = DEFAULT_CRF
// The rastered pngs are scratch - the svgs beside them re-raster at any width
// without re-tracing, so a finished encode has no reason to keep 11gb around.
let keep_frames = false

if (arg_one === WORKER_FLAG) worker_opts = JSON.parse(arg_two)
else {
  input_path = arg_one
  // Read every flag, not a fixed window of three - `--fps N --workers N` is
  // four tokens on its own and used to lose whatever came last.
  const rest = process.argv.slice(3)
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index] ?? ''
    if (token === '--fps') fps = Number(rest[index + 1]) || DEFAULT_FPS
    if (token === '--workers') {
      const n = Number(rest[index + 1])
      if (Number.isInteger(n) && n > 0) workers = n
    }
    if (token === '--width') {
      const n = Number(rest[index + 1])
      if (Number.isInteger(n) && n > 0) width = n
    }
    if (token === '--crf') {
      const n = Number(rest[index + 1])
      if (Number.isInteger(n) && n >= CRF_MIN && n <= CRF_MAX) crf = n
    }
    if (token === '--keep-frames') keep_frames = true
  }
  if (!input_path)
    fail(
      'usage: npm run make:animation <video> [--fps N] [--workers N] [--width N] [--crf N] [--keep-frames]'
    )
  if (!chrome_path)
    fail(
      'no Chromium browser found - set CHROME_PATH (Brave, Chrome, Chromium, or Edge)'
    )
  if (!fs.existsSync(input_path)) fail(`video not found: ${input_path}`)
}

const exec = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    let stderr = ''
    child.stderr.on('data', chunk => {
      stderr += String(chunk)
    })
    child.on('close', code => {
      if (code === 0) resolve()
      else
        reject(new Error(stderr.split('\n').slice(-ERR_TAIL_LINES).join('\n')))
    })
  })

// Run ffmpeg while reporting extraction progress on one \r-updated status
// line. ffmpeg's `-progress pipe:2` writes key=value pairs to stderr; we read
// frame and out_time_us so the master shows it's working instead of appearing
// hung while the whole clip decodes to PNGs.
const extract_frames = (video_path, fps, pattern, on_progress) =>
  new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', [
      '-y',
      '-i',
      video_path,
      '-vf',
      `fps=${fps},scale='min(1200,iw)':-2`,
      '-progress',
      'pipe:2',
      '-nostats',
      pattern
    ])
    let stderr = ''
    let last_tick = 0
    child.stderr.on('data', chunk => {
      stderr += String(chunk)
      // Throttle redraws to ~2/sec; the status line is cheap enough that
      // parsing each chunk is fine.
      const now = Date.now()
      if (now - last_tick < PROGRESS_TICK_MS) return
      last_tick = now
      const frame = Number(/frame=(\d+)/.exec(stderr)?.[1] ?? 0)
      const us = Number(/out_time_us=(\d+)/.exec(stderr)?.[1] ?? 0)
      on_progress?.(frame, us / US_PER_SECOND)
    })
    child.on('close', code => {
      if (code === 0) resolve()
      else
        reject(new Error(stderr.split('\n').slice(-ERR_TAIL_LINES).join('\n')))
    })
  })

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })

const page_socket_url = async debug_port => {
  const deadline = Date.now() + BROWSER_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debug_port}/json/list`)
      const targets = await response.json()
      const page = targets.find(
        target => target.type === 'page' && target.webSocketDebuggerUrl
      )
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // browser is still coming up
    }
    await sleep(BROWSER_POLL_MS)
  }
  throw new Error('browser never exposed a page target')
}

const connect = socket_url =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(socket_url)
    socket.onopen = () => resolve(socket)
    socket.onerror = () => reject(new Error('devtools socket failed'))
  })

const devtools = socket => {
  let next_id = 0
  const pending = new Map()
  socket.onmessage = event => {
    const message = JSON.parse(String(event.data))
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
      return
    }
    if (message.method === 'Runtime.exceptionThrown')
      console.error(
        'make-animation: page error',
        message.params?.exceptionDetails?.exception?.description ??
          message.params?.exceptionDetails?.text
      )
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++next_id
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    })
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text ??
          'evaluate failed'
      )
    return result.result?.value
  }
  return { send, evaluate }
}

const data_url_of = file => {
  const ext = path.extname(file).slice(1) || 'png'
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`
}

const status = message => console.info(`make-animation: ${message}`)

/**
 * The size a png on disk was rastered at, or null when it isn't there.
 * Reads the IHDR header only - these files run to megabytes at 4k.
 */
const png_size_of = file => {
  if (!fs.existsSync(file)) return null
  const buffer = Buffer.alloc(IHDR_HEADER_BYTES)
  const handle = fs.openSync(file, 'r')
  try {
    fs.readSync(handle, buffer, 0, IHDR_HEADER_BYTES, 0)
  } finally {
    fs.closeSync(handle)
  }
  return read_png_size(buffer)
}

/**
 * Trace one source frame through the app's poster pipeline, returning its svg.
 * An empty poster still comes back as a well-formed png and svg, so a render
 * that resolves is not proof the frame is good - a rejected one is traced
 * again rather than written.
 */
const trace_frame = async (evaluate, data_url, label) => {
  for (let attempt = 1; attempt <= RENDER_RETRIES; attempt++)
    try {
      const rendered = JSON.parse(
        await evaluate(
          `window.poster_driver.render(${JSON.stringify(data_url)}).then(r => JSON.stringify({ png: r.png, svg: r.svg }))`
        )
      )
      const problem = frame_problem(rendered)
      if (problem) throw new Error(problem)
      return rendered.svg
    } catch (error) {
      status(`${label} attempt ${attempt} failed: ${error.message}`)
    }
  throw new Error(`${label} failed after retries`)
}

/**
 * Draw a traced poster svg to a canvas at an arbitrary size. The svg carries
 * its own symbols and gradients, so it rasterizes as a plain image with no
 * app around it - which is why a resize never re-traces.
 *
 * Chrome's own --screenshot path hangs on these files; the posters carry SMIL
 * `<animate>` elements and the page never settles. Drawing to a canvas takes
 * the first frame and returns.
 */
const rasterize = async (evaluate, svg, { width, height }) => {
  const data_url = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  const base64 = await evaluate(`(async () => {
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('poster svg failed to load'))
      image.src = ${JSON.stringify(data_url)}
    })
    const canvas = new OffscreenCanvas(${width}, ${height})
    canvas.getContext('2d').drawImage(image, 0, 0, ${width}, ${height})
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (let index = 0; index < bytes.length; index++)
      binary += String.fromCharCode(bytes[index])
    return btoa(binary)
  })()`)
  return Buffer.from(base64, 'base64')
}

// ---- Worker: one headless browser, renders a slice of frames ----
const run_worker = async opts => {
  const {
    source_dir,
    poster_dir,
    start,
    end,
    debug_port,
    worker_id,
    target_width
  } = opts
  const profile_dir = mkdtempSync(path.join(tmpdir(), 'make-animation-prof-'))
  const target_url = `${base_url}${DRIVER_ROUTE}`
  const browser = spawn(
    chrome_path,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${debug_port}`,
      `--user-data-dir=${profile_dir}`,
      target_url
    ],
    { stdio: 'ignore' }
  )
  const shutdown = () => {
    browser.kill()
    try {
      rmSync(profile_dir, {
        recursive: true,
        force: true,
        maxRetries: PROFILE_RM_RETRIES,
        retryDelay: PROFILE_RM_DELAY_MS
      })
    } catch {
      console.warn(`make-animation: left profile dir behind at ${profile_dir}`)
    }
  }
  // Close cleanly on signal so the headless browser is never orphaned holding
  // its debug port.
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.once(sig, () => {
      shutdown()
      process.exit(sig === 'SIGINT' ? SIGINT_EXIT : SIGTERM_EXIT)
    })

  const frame_files = fs
    .readdirSync(source_dir)
    .filter(name => name.endsWith('.png'))
    .sort()

  try {
    const socket = await connect(await page_socket_url(debug_port))
    const { send, evaluate } = devtools(socket)
    await send('Runtime.enable')
    const ready_deadline = Date.now() + READY_TIMEOUT_MS
    let ready = false
    while (Date.now() < ready_deadline) {
      if (await evaluate('window.poster_driver?.ready === true')) {
        ready = true
        break
      }
      await sleep(POLL_MS)
    }
    if (!ready) throw new Error('poster driver never became ready')

    for (let index = start; index < end; index++) {
      const frame_stem = `poster-${String(index + 1).padStart(5, '0')}`
      const out_png = path.join(poster_dir, `${frame_stem}.png`)
      const out_svg = path.join(poster_dir, `${frame_stem}.svg`)

      // The traced svg is the master. Tracing is the expensive step, so it
      // only runs when the svg is missing - a rerun at a different --width
      // rasterizes the svgs already on disk and never touches the pipeline.
      let svg = fs.existsSync(out_svg) ? fs.readFileSync(out_svg, 'utf8') : null

      if (!svg) {
        const frame = frame_files[index]
        status(
          `tracing ${index + 1}/${frame_files.length} (worker ${worker_id})`
        )
        svg = await trace_frame(
          evaluate,
          data_url_of(path.join(source_dir, frame)),
          `frame ${index + 1}`
        )
        fs.writeFileSync(out_svg, svg)
      }

      const size = poster_raster_size(svg, target_width)
      if (!size) throw new Error(`frame ${index + 1} svg has no usable viewBox`)

      // Resume: a png already at the requested size is left alone, so an
      // interrupted batch only redoes what is missing or the wrong size.
      if (png_size_of(out_png)?.width === size.width) {
        status(`skipping ${frame_stem} (already ${size.width}px)`)
        continue
      }

      status(
        `rastering ${index + 1}/${frame_files.length} at ${size.width}x${size.height} (worker ${worker_id})`
      )
      fs.writeFileSync(out_png, await rasterize(evaluate, svg, size))
    }
  } finally {
    shutdown()
  }
}

// ---- Master: extract, fork workers, encode ----
const run_master = async () => {
  const phase_time = {}
  const t0 = Date.now()
  const mark = name => {
    phase_time[name] = Date.now()
  }

  const tmp = mkdtempSync(path.join(tmpdir(), 'make-animation-'))
  const source_dir = path.join(tmp, 'source')
  // Keep the per-frame poster PNGs next to the output so each can be reviewed
  const stem = path.basename(input_path, path.extname(input_path))
  const poster_dir = path.join(out_dir, `${stem}-frames`)
  fs.mkdirSync(source_dir, { recursive: true })
  // Do NOT wipe poster_dir - the traced svgs in it are the master, and an
  // interrupted run only redoes what is missing.
  fs.mkdirSync(poster_dir, { recursive: true })
  const traced = fs
    .readdirSync(poster_dir)
    .filter(name => name.endsWith('.svg')).length
  if (traced > 0)
    console.info(
      `make-animation: resuming - ${traced} frame(s) already traced will be reused`
    )
  if (width > 0) console.info(`make-animation: rastering posters ${width}px wide`)

  console.info(
    `make-animation: extracting ${fps}fps frames from ${path.basename(input_path)}`
  )
  let last_tick = 0
  await extract_frames(
    input_path,
    fps,
    `${source_dir}/frame-%05d.png`,
    (frame, seconds) => {
      const now = Date.now()
      if (now - last_tick < PROGRESS_TICK_MS) return
      last_tick = now
      process.stderr.write(
        `\rmake-animation: extracting ${frame} frames (${seconds.toFixed(1)}s)   `
      )
    }
  )
  process.stderr.write(`\r${' '.repeat(STATUS_PAD)}\r`)
  mark('extract')
  const frame_files = fs
    .readdirSync(source_dir)
    .filter(name => name.endsWith('.png'))
    .sort()
  if (!frame_files.length) throw new Error('no frames extracted')
  console.info(`make-animation: ${frame_files.length} frames`)
  const n_workers = Math.min(workers, frame_files.length)
  console.info(
    `make-animation: ${n_workers} worker(s), ${os.availableParallelism?.() ?? '?'} cores`
  )

  // Partition [0, frame_count) into contiguous slices.
  const slices = []
  const base = Math.floor(frame_files.length / n_workers)
  const rem = frame_files.length % n_workers
  let cursor = 0
  for (let w = 0; w < n_workers; w++) {
    const size = base + (w < rem ? 1 : 0)
    slices.push({ start: cursor, end: cursor + size })
    cursor += size
  }

  const children = slices.map((slice, w) => {
    const opts = {
      worker_id: w,
      source_dir,
      poster_dir,
      start: slice.start,
      end: slice.end,
      debug_port: DEBUG_PORT + w,
      target_width: width
    }
    return fork(__filename, [WORKER_FLAG, JSON.stringify(opts)], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc']
    })
  })

  const cleanup_tmp = () => {
    try {
      rmSync(tmp, { recursive: true, force: true })
    } catch {
      console.warn('make-animation: left temp dir behind')
    }
  }
  // On close, terminate the workers so their browsers aren't orphaned, then
  // leave the rendered frames in place for a resumable rerun.
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.once(sig, () => {
      for (const child of children)
        child.kill(sig === 'SIGINT' ? 'SIGINT' : 'SIGTERM')
      cleanup_tmp()
      process.exit(sig === 'SIGINT' ? SIGINT_EXIT : SIGTERM_EXIT)
    })

  try {
    const exit_codes = await Promise.all(
      children.map(
        child =>
          new Promise(resolve => {
            child.on('exit', code => resolve(code))
          })
      )
    )
    mark('render')
    const failed = exit_codes.filter(code => code !== 0).length
    if (failed > 0)
      throw new Error(
        `${failed}/${n_workers} workers failed (codes ${exit_codes.join(',')})`
      )

    const out_file = path.join(out_dir, `${stem}.mp4`)
    // The encode reads the clip again for its soundtrack, so writing over it
    // would be reading and writing one file at once.
    if (path.resolve(out_file) === path.resolve(input_path))
      throw new Error(`refusing to overwrite the source clip at ${out_file}`)
    fs.mkdirSync(out_dir, { recursive: true })
    const rendered_frames = fs
      .readdirSync(poster_dir)
      .filter(name => name.endsWith('.png')).length
    console.info(
      `make-animation: encoding ${rendered_frames} frames -> ${path.basename(out_file)}`
    )
    await exec('ffmpeg', [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      `${poster_dir}/poster-%05d.png`,
      // The clip again, for its soundtrack. Tracing covers the same span at
      // whatever --fps was asked for, so the audio still lines up.
      '-i',
      input_path,
      // libx264 + yuv420p requires even dimensions; traced posters can be odd
      '-vf',
      'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-map',
      '0:v',
      // Optional - a silent clip encodes to a silent poster video.
      '-map',
      '1:a?',
      '-c:v',
      'libx264',
      '-crf',
      String(crf),
      '-pix_fmt',
      'yuv420p',
      // Re-encode rather than copy: .mov often carries pcm, which mp4 rejects.
      '-c:a',
      'aac',
      '-b:a',
      AUDIO_BITRATE,
      '-shortest',
      '-movflags',
      '+faststart',
      out_file
    ])
    mark('encode')
    console.info(
      `make-animation: phases ${JSON.stringify({
        total_ms: Date.now() - t0,
        extract_ms: phase_time.extract - t0,
        render_ms: phase_time.render - phase_time.extract,
        encode_ms: phase_time.encode - phase_time.render,
        frames: frame_files.length,
        workers: n_workers
      })}`
    )
    console.info(`make-animation: wrote ${out_file}`)
    // Only once the encode has succeeded: the pngs have served their purpose,
    // and the svgs beside them re-raster at any --width without re-tracing.
    if (keep_frames) console.info(`make-animation: kept frames in ${poster_dir}`)
    else {
      const freed = clear_raster_frames(poster_dir)
      console.info(
        `make-animation: cleared ${freed.count} raster frame(s), ${Math.round(freed.bytes / BYTES_PER_MB)}MB - kept the svgs in ${poster_dir}`
      )
    }
  } finally {
    cleanup_tmp()
  }
}

if (worker_opts)
  run_worker(worker_opts)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(`make-animation: worker ${error.message}`)
      process.exit(1)
    })
else
  run_master()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(`make-animation: ${error.message}`)
      process.exit(1)
    })
