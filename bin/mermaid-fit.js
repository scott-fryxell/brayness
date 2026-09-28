#!/usr/bin/env node
// Measure a mermaid diagram with pi's own feed renderer.
// Usage: bin/mermaid-fit.js [file|-] [--max N]   (default max 70)
// Exit 0: renders in the feed. Exit 1: too wide or warnings; raw fence shows.
import { readFileSync, readdirSync, copyFileSync, appendFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const chunks = join(root, '.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/dist/bundle/chunks')
const args = process.argv.slice(2)
const maxAt = args.indexOf('--max')
const max = maxAt >= 0 ? Number(args.splice(maxAt, 2)[1]) : 70
const input = args[0] && args[0] !== '-' ? readFileSync(args[0], 'utf8') : readFileSync(0, 'utf8')
const fence = input.match(/```mermaid\n([\s\S]*?)```/)
const src = (fence ? fence[1] : input).trim()

const chunk = readdirSync(chunks).find(f =>
  f.endsWith('.js') && readFileSync(join(chunks, f), 'utf8').includes('function createMermaidMarkdownTransformer'))
if (!chunk) { console.error('pi mermaid renderer not found'); process.exit(2) }
const probe = join(chunks, `zz-mermaid-fit-${process.pid}.js`)
copyFileSync(join(chunks, chunk), probe)
appendFileSync(probe, ';export {render as __mermaidFit};')
let art
try { art = (await import(probe)).__mermaidFit(src) } finally { rmSync(probe, { force: true }) }

if (!art) { console.log('unparseable: pi shows the raw fence'); process.exit(1) }
const ok = art.width <= max && art.warnings.length === 0
console.log(`width ${art.width} / max ${max}${art.warnings.length ? ` warnings: ${art.warnings.join('; ')}` : ''} -> ${ok ? 'renders' : 'raw fence'}`)
process.exit(ok ? 0 : 1)
