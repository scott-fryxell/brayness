// Which files in a folder become posters, and where their posters land.
//
// Pure helpers for make-posters.js, kept apart so they test without a
// browser or a disk full of art.

import fs from 'node:fs'
import path from 'node:path'

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'])
const VIDEO_EXT = new Set(['mov', 'mp4', 'm4v', 'mkv', 'webm', 'avi'])

/**
 * What a file is, for tracing. Images trace directly, videos trace one frame,
 * and everything else gets a record with no poster.
 *
 * @param {string} file
 * @returns {'image' | 'video' | 'other'}
 */
export const kind_of = file => {
  const ext = path.extname(file).slice(1).toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  return 'other'
}

/**
 * Every file under a folder, relative paths sorted, dotfiles skipped.
 *
 * @param {string} root
 * @returns {{ rel: string, abs: string, kind: 'image' | 'video' | 'other' }[]}
 */
export const list_sources = root => {
  const found = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(abs)
      else if (entry.isFile())
        found.push({ rel: path.relative(root, abs), abs, kind: kind_of(abs) })
    }
  }
  walk(root)
  return found.sort((a, b) => a.rel.localeCompare(b.rel))
}

/**
 * Where a source's poster and record live. The extension stays in the name so
 * `a.jpg` and `a.png` in one folder never share a poster.
 *
 * @param {string} out_root
 * @param {string} rel
 * @returns {{ svg: string, record: string }}
 */
export const poster_paths_for = (out_root, rel) => {
  const base = path.join(out_root, rel)
  return { svg: `${base}.svg`, record: `${base}.json` }
}

/**
 * Split a list into `n` contiguous slices of near-equal length.
 *
 * @template T
 * @param {T[]} items
 * @param {number} n
 * @returns {T[][]}
 */
export const slices_of = (items, n) => {
  const count = Math.max(1, Math.min(n, items.length))
  const base = Math.floor(items.length / count)
  const rem = items.length % count
  const slices = []
  let cursor = 0
  for (let index = 0; index < count; index++) {
    const size = base + (index < rem ? 1 : 0)
    slices.push(items.slice(cursor, cursor + size))
    cursor += size
  }
  return slices
}
