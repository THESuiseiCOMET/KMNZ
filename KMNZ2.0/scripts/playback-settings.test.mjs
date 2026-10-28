import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/components/PlaybackSettings.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText

function harness(props = {}) {
  const effects = [], changes = [], listeners = new Map()
  let closes = 0, starts = 0, stops = 0, focused = false
  const details = { open: true }, group = { contains: target => target === inside, querySelector: () => ({ focus: () => { focused = true } }) }
  class FakeNode {}
  const inside = new FakeNode(), outside = new FakeNode()
  const refs = [{ current: { closest: () => group } }, { current: details }]
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => name === 'react' ? {
    useEffect: fn => effects.push(fn), useRef: () => refs.shift(),
  } : require(name), module, module.exports)
  const settings = { presentation: 'cinema', frosted: { floating: false, cinema: true }, cinemaVideoFrosted: false }
  const tree = module.exports.default({ open: true, settings, onChange: value => changes.push(value), onClose: () => closes++, onStartVisualization: () => starts++, onStopVisualization: () => stops++, ...props })
  function find(label) {
    function visit(node) {
      if (!node || typeof node !== 'object') return null
      if (node.props?.['aria-label'] === label && node.type === 'button') return node
      for (const child of [node.props?.children].flat(Infinity)) { const match = visit(child); if (match) return match }
      return null
    }
    const result = visit(tree)
    assert(result, label)
    return result
  }
  function mount() {
    const saved = ['document', 'Node'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
    Object.defineProperty(globalThis, 'Node', { configurable: true, value: FakeNode })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name) },
    } })
    const cleanups = effects.map(fn => fn())
    return () => {
      for (const cleanup of cleanups) cleanup?.()
      for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name] }
    }
  }
  return { tree, settings, changes, find, mount, listeners, inside, outside, details, counts: () => ({ closes, starts, stops, focused }) }
}

test('icon toggles preserve the other presentation frost preference and independent video frost', () => {
  const h = harness()
  h.find('切换到浮窗模式').props.onClick()
  assert.deepEqual(h.changes.pop(), { ...h.settings, presentation: 'floating' })
  h.find('背景磨砂').props.onClick()
  assert.deepEqual(h.changes.pop(), { ...h.settings, frosted: { floating: false, cinema: false } })
  h.find('视频磨砂').props.onClick()
  assert.deepEqual(h.changes.pop(), { ...h.settings, cinemaVideoFrosted: true })
})

test('visualizer icon starts only on click and cancels an active or pending request', () => {
  const idle = harness()
  assert.equal(idle.counts().starts, 0)
  idle.find('音频可视化').props.onClick()
  assert.equal(idle.counts().starts, 1)
  for (const props of [{ visualizationEnabled: true }, { visualizationPending: true }]) {
    const h = harness(props), toggle = h.find('音频可视化')
    assert.equal(toggle.props['aria-checked'], true)
    toggle.props.onClick()
    assert.equal(h.counts().stops, 1)
    assert.equal(h.counts().starts, 0)
  }
  assert.equal(harness({ loadingInputs: true }).find('音频可视化').props.disabled, true)
})

test('settings ignore inside clicks, close outside or on Escape, and remove listeners', () => {
  const h = harness(), unmount = h.mount()
  try {
    h.listeners.get('pointerdown')({ target: h.inside })
    assert.equal(h.counts().closes, 0)
    h.listeners.get('pointerdown')({ target: h.outside })
    assert.equal(h.counts().closes, 1)
    h.listeners.get('keydown')({ key: 'Escape', defaultPrevented: true })
    assert.equal(h.counts().closes, 1)
    h.listeners.get('keydown')({ key: 'Escape', stopPropagation() {} })
    assert.equal(h.counts().closes, 2)
    assert.equal(h.counts().focused, true)
  } finally { unmount() }
  assert.equal(h.listeners.size, 0)
})

test('closed settings are inert and collapse the device panel; errors expose audio options', () => {
  const closed = harness({ open: false }), cleanClosed = closed.mount()
  try {
    assert.equal(closed.tree.props.inert, true)
    assert.equal(closed.tree.props['aria-hidden'], true)
    assert.equal(closed.details.open, false)
    assert.equal(closed.listeners.size, 0)
  } finally { cleanClosed() }
  const error = harness({ visualizationError: '音频不可用' })
  error.details.open = false
  const cleanError = error.mount()
  try { assert.equal(error.details.open, true) } finally { cleanError() }
})
