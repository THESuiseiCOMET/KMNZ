import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/hooks/usePageTransition.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function harness({ supported = true, reduced = false, throws = false } = {}) {
  const prior = ['window', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  const transitions = [], cleanups = [], root = { dataset: {} }
  const pages = ['home', 'music', 'members', 'history', 'about', 'future-page']
  const document = {
    documentElement: root,
    querySelectorAll: selector => selector.includes('music-platform-labels')
      ? ['youtube', 'spotify'].map(segmentValue => ({ dataset: { segmentValue } }))
      : selector.includes('music-category-labels') ? ['all', 'albums', 'ep'].map(segmentValue => ({ dataset: { segmentValue } }))
        : pages.map(navPage => ({ dataset: { navPage } })),
    startViewTransition: supported ? update => {
      if (throws) throw new Error('unavailable')
      let resolve, reject
      const transition = { skipped: false, ready: Promise.resolve(), finished: new Promise((yes, no) => { resolve = yes; reject = no }),
        commit: update, finish: () => resolve(), fail: () => reject(new Error('capture failed')),
        skipTransition() { this.skipped = true } }
      transitions.push(transition)
      return transition
    } : undefined,
  }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => ({ matches: reduced }) } })
  const react = { useRef: value => ({ current: value }), useCallback: fn => fn, useEffect: fn => cleanups.push(fn()) }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => name === 'react' ? react : { flushSync: fn => fn() }, module, module.exports)
  const run = module.exports.usePageTransition()
  return {
    run, root, transitions,
    async cleanup() {
      cleanups.forEach(fn => fn?.())
      for (const transition of transitions) transition.finish()
      await Promise.resolve()
      assert.equal(root.dataset.pageTransition, undefined)
      assert.equal(root.dataset.musicTransition, undefined)
      for (const [name, descriptor] of prior) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor)
        else delete globalThis[name]
      }
    },
  }
}

test('page transition direction follows navigation order, including future pages and member detail return', async () => {
  const h = harness()
  try {
    let updates = 0
    for (const [from, to, direction] of [
      ['home', 'music', 'forward'], ['about', 'members', 'backward'],
      ['about', 'future-page', 'forward'], ['members', 'member-2', 'forward'], ['member-2', 'members', 'backward'],
    ]) {
      h.run(from, to, () => updates++)
      assert.equal(h.root.dataset.pageTransition, direction)
      const transition = h.transitions.at(-1), before = updates
      transition.commit(); transition.commit(); assert.equal(updates, before + 1)
      transition.finish(); await Promise.resolve()
      assert.equal(h.root.dataset.pageTransition, undefined)
    }
  } finally { await h.cleanup() }
})

test('rapid navigation skips outdated snapshots and commits only the latest pending destination', async () => {
  const h = harness(), updates = []
  try {
    h.run('home', 'music', () => updates.push('music'))
    const first = h.transitions[0]
    h.run('home', 'about', () => updates.push('about'))
    const second = h.transitions[1]
    assert(first.skipped)
    first.commit(); assert.deepEqual(updates, [])
    first.finish(); await Promise.resolve(); assert.equal(h.root.dataset.pageTransition, 'forward')
    second.commit(); assert.deepEqual(updates, ['about'])
    second.finish(); await Promise.resolve(); assert.equal(h.root.dataset.pageTransition, undefined)
  } finally { await h.cleanup() }
})

test('reduced motion, unsupported browsers and synchronous failures still update exactly once', async () => {
  for (const options of [{ reduced: true }, { supported: false }, { throws: true }]) {
    const h = harness(options)
    try {
      let updates = 0
      h.run('home', 'about', () => updates++)
      assert.equal(updates, 1); assert.equal(h.root.dataset.pageTransition, undefined)
    } finally { await h.cleanup() }
  }
})

test('reselecting the current page cancels a pending destination without starting another animation', async () => {
  const h = harness(), updates = []
  try {
    h.run('home', 'music', () => updates.push('music'))
    h.run('home', 'home', () => updates.push('home'))
    h.transitions[0].commit()
    assert(h.transitions[0].skipped)
    assert.equal(h.transitions.length, 1)
    assert.deepEqual(updates, ['home'])
    assert.equal(h.root.dataset.pageTransition, undefined)
  } finally { await h.cleanup() }
})

test('asynchronous capture failure falls back once; unmount rejects stale pending updates', async () => {
  const h = harness()
  let updates = 0
  h.run('home', 'about', () => updates++)
  h.transitions[0].fail(); await Promise.resolve()
  assert.equal(updates, 1); assert.equal(h.root.dataset.pageTransition, undefined)
  h.transitions[0].commit(); assert.equal(updates, 1)
  h.run('about', 'music', () => updates++)
  await h.cleanup()
  h.transitions[1].commit(); assert.equal(updates, 1)
  assert(h.transitions[1].skipped)
})

const musicRoute = (patch = {}) => ({ platform: 'youtube', category: 'all', search: '', releaseSourceId: null, ...patch })

test('music platform transitions follow tab direction and keep page motion inactive', async () => {
  const h = harness()
  try {
    let updates = 0
    for (const [from, to, expected] of [
      [musicRoute(), musicRoute({ platform: 'spotify' }), 'platform-forward'],
      [musicRoute({ platform: 'spotify' }), musicRoute(), 'platform-backward'],
    ]) {
      h.run('music', 'music', () => updates++, { from, to })
      assert.equal(h.root.dataset.musicTransition, expected)
      assert.equal(h.root.dataset.pageTransition, undefined)
      h.transitions.at(-1).commit(); h.transitions.at(-1).finish(); await Promise.resolve()
      assert.equal(h.root.dataset.musicTransition, undefined)
    }
    assert.equal(updates, 2)
  } finally { await h.cleanup() }
})

test('Spotify category changes animate in button order; search and release details stay immediate', async () => {
  const h = harness()
  try {
    const from = musicRoute({ platform: 'spotify' })
    h.run('music', 'music', () => {}, { from, to: { ...from, category: 'ep' } })
    assert.equal(h.root.dataset.musicTransition, 'category-forward')
    h.transitions.at(-1).commit(); h.transitions.at(-1).finish(); await Promise.resolve()
    h.run('music', 'music', () => {}, { from: { ...from, category: 'ep' }, to: { ...from, category: 'albums' } })
    assert.equal(h.root.dataset.musicTransition, 'category-backward')
    h.transitions.at(-1).commit(); h.transitions.at(-1).finish(); await Promise.resolve()
    let updates = 0
    const count = h.transitions.length
    for (const to of [{ ...from, search: 'KMNZ' }, { ...from, releaseSourceId: 'verified-album' }]) {
      h.run('music', 'music', () => updates++, { from, to })
      assert.equal(h.root.dataset.musicTransition, undefined)
    }
    h.run('music', 'music', () => updates++, { from: { ...from, releaseSourceId: 'verified-album' }, to: { ...from, category: 'ep' } })
    assert.equal(updates, 3); assert.equal(h.transitions.length, count)
  } finally { await h.cleanup() }
})

test('reselecting the active platform cancels a pending switch and reduced motion commits without a transition', async () => {
  const h = harness(), from = musicRoute(), to = musicRoute({ platform: 'spotify' }), updates = []
  try {
    h.run('music', 'music', () => updates.push('spotify'), { from, to })
    h.run('music', 'music', () => updates.push('youtube'), { from, to: from })
    h.transitions[0].commit()
    assert(h.transitions[0].skipped); assert.deepEqual(updates, ['youtube'])
    assert.equal(h.root.dataset.musicTransition, undefined)
  } finally { await h.cleanup() }
  const reduced = harness({ reduced: true })
  try {
    let updated = false
    reduced.run('music', 'music', () => { updated = true }, { from, to })
    assert(updated); assert.equal(reduced.transitions.length, 0)
  } finally { await reduced.cleanup() }
})

test('YouTube primary, period and member toggles animate results, including deselection, without page motion', async()=>{
  const h=harness()
  try {
    for(const [from,to] of [
      [musicRoute(),musicRoute({youtubeCategory:'original'})],
      [musicRoute({youtubeCategory:'original'}),musicRoute({youtubeCategory:'original',youtubeGroup:'special'})],
      [musicRoute({youtubeCategory:'original',youtubeGroup:'special'}),musicRoute()],
      [musicRoute({youtubeCategory:'cover'}),musicRoute({youtubeCategory:'cover',youtubeMember:'LITA'})],
      [musicRoute({youtubeCategory:'cover',youtubeMember:'LITA'}),musicRoute({youtubeCategory:'cover'})],
    ]) {
      h.run('music','music',()=>{},{from,to})
      assert(h.root.dataset.musicTransition.startsWith('category-'))
      assert.equal(h.root.dataset.pageTransition,undefined)
      h.transitions.at(-1).commit();h.transitions.at(-1).finish();await Promise.resolve()
    }
  } finally {await h.cleanup()}
})
