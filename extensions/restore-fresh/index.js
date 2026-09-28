/**
 * Restore-fresh: a new conversation for each clone of a snapshotted Pi.
 *
 * Hosted actors resume one seed snapshot with Pi already running, so every
 * clone wakes holding the seed's conversation id and timestamp.
 * `brayness-actor-init` sends SIGUSR2 after a restore; this starts a new
 * conversation. Pi writes nothing before the first reply, so nothing is lost.
 *
 * The pid file is the contract: Node's default SIGUSR2 action is to exit, so
 * actor-init signals only a Pi that wrote it. Inert outside a hosted guest.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const GUEST = "/etc/brayness"
// /run/brayness is Pi's own: Pi runs as the brayness user, not root.
const PID_FILE = "/run/brayness/pi.pid"
// actor-init writes a fresh id here; kernel randomness, not Node's buffered pool.
const ID_FILE = "/run/brayness/pi-session-id"

/** @param {import("@earendil-works/pi-coding-agent").ExtensionAPI} pi */
export default function (pi) {
  if (!existsSync(GUEST)) return

  /** @type {any} */
  let sessions = null

  pi.on("session_start", (_event, ctx) => {
    sessions = ctx.sessionManager
  })

  process.on("SIGUSR2", () => {
    if (!sessions) return
    let id
    try {
      id = readFileSync(ID_FILE, "utf8").trim() || undefined
    } catch {
      id = undefined
    }
    const file = sessions.newSession(id ? { id } : undefined)
    // Pi makes the folder once at startup; the restore may have emptied it.
    if (file) mkdirSync(dirname(file), { recursive: true })
  })

  writeFileSync(PID_FILE, `${process.pid}\n`)
  process.on("exit", () => rmSync(PID_FILE, { force: true }))
}
