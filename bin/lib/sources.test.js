import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { kind_of, list_sources, poster_paths_for, slices_of } from './sources.js'

test('kind_of sorts images, videos, and the rest', () => {
  assert.equal(kind_of('a/b/Photo.JPG'), 'image')
  assert.equal(kind_of('x.webp'), 'image')
  assert.equal(kind_of('clip.mov'), 'video')
  assert.equal(kind_of('scene.blend'), 'other')
  assert.equal(kind_of('noext'), 'other')
})

test('list_sources walks nested folders, skips dotfiles, sorts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sources-test-'))
  try {
    fs.mkdirSync(path.join(root, 'b'))
    fs.writeFileSync(path.join(root, 'b', 'two.png'), '')
    fs.writeFileSync(path.join(root, 'a.mov'), '')
    fs.writeFileSync(path.join(root, '.DS_Store'), '')
    fs.mkdirSync(path.join(root, '.hidden'))
    fs.writeFileSync(path.join(root, '.hidden', 'x.png'), '')
    const found = list_sources(root)
    assert.deepEqual(
      found.map(({ rel, kind }) => [rel, kind]),
      [
        ['a.mov', 'video'],
        [path.join('b', 'two.png'), 'image']
      ]
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('poster_paths_for keeps the source extension in the name', () => {
  const jpg = poster_paths_for('/out', 'dir/a.jpg')
  const png = poster_paths_for('/out', 'dir/a.png')
  assert.equal(jpg.svg, '/out/dir/a.jpg.svg')
  assert.equal(jpg.record, '/out/dir/a.jpg.json')
  assert.notEqual(jpg.svg, png.svg)
})

test('slices_of splits evenly and never makes empty slices', () => {
  assert.deepEqual(slices_of([1, 2, 3, 4, 5], 2), [
    [1, 2, 3],
    [4, 5]
  ])
  assert.deepEqual(slices_of([1, 2], 6), [[1], [2]])
  assert.deepEqual(slices_of([], 3), [[]])
})
