import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTypeScript } from './load-typescript.mjs'
const { scrollbarGeometry: geometry, scrollFromThumb, scrollForKey } = await loadTypeScript(new URL('../src/lib/pageScrollbar.ts', import.meta.url))

test('overlay thumb maps the full document range to its track without consuming viewport width', () => {
  const start = geometry(0, 800, 4000, 792)
  assert.equal(start.maximum, 3200)
  assert.equal(start.thumbHeight, 158.4)
  assert.equal(start.thumbTop, 0)
  const middle = geometry(1600, 800, 4000, 792)
  assert.equal(middle.thumbTop, middle.travel / 2)
  assert.equal(scrollFromThumb(middle.thumbTop, middle.maximum, middle.travel), 1600)
  const end = geometry(99999, 800, 4000, 792)
  assert.equal(end.position, 3200)
  assert.equal(end.thumbTop, end.travel)
  assert.equal(scrollFromThumb(9999, end.maximum, end.travel), 3200)
  assert.equal(scrollFromThumb(-100, end.maximum, end.travel), 0)
})

test('short pages, very long music lists and resized tracks retain valid thumb boundaries', () => {
  assert.equal(geometry(0, 800, 800, 792).maximum, 0)
  assert.equal(geometry(999, 800, 100, 792).position, 0)
  const long = geometry(5000, 800, 100000, 792)
  assert.equal(long.thumbHeight, 32)
  assert(long.thumbTop >= 0 && long.thumbTop <= long.travel)
  assert.equal(geometry(0, 20, 100, 12).thumbHeight, 12)
  assert.equal(scrollFromThumb(100, 1000, 0), 0)
  assert.equal(geometry(0, 0, 0, 0).thumbTop, 0)
})

test('scrollbar keyboard supports arrows, page movement and document boundaries', () => {
  for (const [key, result] of [['ArrowDown', 540], ['ArrowUp', 460], ['PageDown', 1220], ['PageUp', 0], ['Home', 0], ['End', 3200]]) assert.equal(scrollForKey(key, 500, 800, 3200), result)
  assert.equal(scrollForKey('ArrowDown', 3199, 800, 3200), 3200)
  assert.equal(scrollForKey('ArrowUp', 0, 800, 3200), 0)
  assert.equal(scrollForKey('Escape', 500, 800, 3200), null)
})
