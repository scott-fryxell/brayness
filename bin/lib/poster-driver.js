// Drive realness's /poster-driver page in a headless browser.
//
// Shared by make-animation.js and make-posters.js. One call to open_driver
// starts one browser on one debug port and waits until the tracing workers
// are mounted; trace() then runs any number of images through it. Node
// builtins only - no npm packages, no checkout of realness.

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

// Render against the deployed site so a render never depends on a local
// build, prerender, or wasm step being present and current. Override for a
// preview (e.g. REALNESS_URL=https://realness.local).
export const base_url = process.env.REALNESS_URL || 'https://realness.online'
export const DRIVER_ROUTE = '/poster-driver'

const READY_TIMEOUT_MS = 120000
const POLL_MS = 1000
const BROWSER_TIMEOUT_MS = 20000
const BROWSER_POLL_MS = 200
const RENDER_RETRIES = 3
const PROFILE_RM_RETRIES = 5
const PROFILE_RM_DELAY_MS = 200
const SIGINT_EXIT = 130
const SIGTERM_EXIT = 143

const BROWSER_CANDIDATES = [
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(fs.existsSync)

export const chrome_path =
  (process.env.CHROME_PATH &&
    fs.existsSync(process.env.CHROME_PATH) &&
    process.env.CHROME_PATH) ||
  BROWSER_CANDIDATES[0]

export const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })

/**
 * Why a rendered poster cannot be kept, or null when it is usable.
 *
 * A poster whose symbol defs never mounted still exports a well-formed png and
 * svg - just an empty shell, with `use` hrefs pointing at symbols that were
 * never merged in. Traced paths are the proof the poster is real, so a
 * pathless one is a failed render and not a poster to write.
 *
 * @param {{ png?: string, svg?: string }} [poster]
 * @param {{ want_png?: boolean }} [options]
 * @returns {string | null}
 */
export const frame_problem = ({ png, svg } = {}, { want_png = true } = {}) => {
  if (want_png && !png) return 'produced no poster png'
  if (!svg) return 'produced no poster svg'
  if (!svg.includes('<path')) return 'traced no paths'
  return null
}

const MIME_BY_EXT = { jpg: 'jpeg', tif: 'tiff', svg: 'svg+xml' }

/** @param {string} file */
export const data_url_of = file => {
  const ext = path.extname(file).slice(1).toLowerCase() || 'png'
  const mime = MIME_BY_EXT[ext] ?? ext
  return `data:image/${mime};base64,${fs.readFileSync(file).toString('base64')}`
}

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

const devtools = (socket, name) => {
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
        `${name}: page error`,
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

/**
 * Start one headless browser on the poster driver and wait until it is ready.
 *
 * The browser gets its own throwaway profile and closes on SIGINT or SIGTERM,
 * so it is never orphaned holding its debug port - the next run would attach
 * to it and two processes would drive one page.
 *
 * @param {{ debug_port: number, name: string }} options
 * @returns {Promise<{ evaluate: (expression: string) => Promise<any>, shutdown: () => void }>}
 */
export const open_driver = async ({ debug_port, name }) => {
  if (!chrome_path)
    throw new Error(
      'no Chromium browser found - set CHROME_PATH (Brave, Chrome, Chromium, or Edge)'
    )
  const profile_dir = mkdtempSync(path.join(tmpdir(), `${name}-prof-`))
  const browser = spawn(
    chrome_path,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${debug_port}`,
      `--user-data-dir=${profile_dir}`,
      `${base_url}${DRIVER_ROUTE}`
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
      console.warn(`${name}: left profile dir behind at ${profile_dir}`)
    }
  }
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.once(sig, () => {
      shutdown()
      process.exit(sig === 'SIGINT' ? SIGINT_EXIT : SIGTERM_EXIT)
    })

  try {
    const socket = await connect(await page_socket_url(debug_port))
    const { send, evaluate } = devtools(socket, name)
    await send('Runtime.enable')
    const deadline = Date.now() + READY_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (await evaluate('window.poster_driver?.ready === true'))
        return { evaluate, shutdown }
      await sleep(POLL_MS)
    }
    throw new Error('poster driver never became ready')
  } catch (error) {
    shutdown()
    throw error
  }
}

/**
 * Trace one image through the app's poster pipeline, returning its svg (and
 * png when asked for). An empty poster still comes back well formed, so a
 * render that resolves is not proof the poster is good - a rejected one is
 * traced again rather than written.
 *
 * @param {(expression: string) => Promise<any>} evaluate
 * @param {string} data_url
 * @param {{ label: string, want_png?: boolean, status?: (message: string) => void }} options
 * @returns {Promise<{ svg: string, png?: string }>}
 */
export const trace = async (
  evaluate,
  data_url,
  { label, want_png = true, status = console.info }
) => {
  const options = want_png ? '' : `, { formats: [] }`
  for (let attempt = 1; attempt <= RENDER_RETRIES; attempt++)
    try {
      const rendered = JSON.parse(
        await evaluate(
          `window.poster_driver.render(${JSON.stringify(data_url)}${options}).then(r => JSON.stringify({ png: r.png, svg: r.svg }))`
        )
      )
      const problem = frame_problem(rendered, { want_png })
      if (problem) throw new Error(problem)
      return rendered
    } catch (error) {
      status(`${label} attempt ${attempt} failed: ${error.message}`)
    }
  throw new Error(`${label} failed after retries`)
}
