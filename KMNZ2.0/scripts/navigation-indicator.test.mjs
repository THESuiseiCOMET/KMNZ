import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/hooks/useNavigationIndicator.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function harness() {
  const saved = ['window', 'ResizeObserver'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  const listeners = new Map(), observers = [], slots = [], pending = []
  const buttons = [
    { id: 'home', offsetLeft: 0, offsetTop: 0, offsetWidth: 52, offsetHeight: 36 },
    { id: 'music', offsetLeft: 60, offsetTop: 0, offsetWidth: 72, offsetHeight: 36 },
  ]
  let cursor = 0, page = 'home', menuOpen = false, current = 'home'
  const links = { querySelector: () => buttons.find(button => button.id === current) ?? null, querySelectorAll: () => buttons }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    addEventListener(name, fn) { listeners.set(name, fn) },
    removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name) },
  } })
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class {
    constructor(callback) { this.callback = callback; this.targets = new Set(); this.disconnected = false; observers.push(this) }
    observe(target) { this.targets.add(target) }
    disconnect() { this.disconnected = true; this.targets.clear() }
  } })
  const react = {
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value } },
    useState(value) {
      const index = cursor++; slots[index] ??= { value }
      return [slots[index].value, next => { slots[index].value = typeof next === 'function' ? next(slots[index].value) : next }]
    },
    useLayoutEffect(fn, deps) {
      const index = cursor++, old = slots[index]
      if (!old || deps.some((value, position) => !Object.is(value, old.deps[position]))) {
        pending.push(() => { old?.cleanup?.(); slots[index] = { deps, cleanup: fn() } })
      }
    },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(() => react, module, module.exports)
  function render() {
    cursor = 0
    const result = module.exports.useNavigationIndicator(page, menuOpen)
    result.linksRef.current = links
    pending.splice(0).forEach(run => run())
    return result
  }
  return {
    buttons, observers, render,
    select(id) { current = page = id; render(); return render().indicator },
    open() { menuOpen = true; render(); return render().indicator },
    resize() { observers.at(-1).callback(); return render().indicator },
    windowResize() { listeners.get('resize')(); return render().indicator },
    cleanup() {
      try {
        slots.forEach(slot => slot?.cleanup?.())
        assert.equal(listeners.size, 0)
        assert(observers.every(observer => observer.disconnected))
      } finally {
        for (const [name, descriptor] of saved) {
          if (descriptor) Object.defineProperty(globalThis, name, descriptor)
          else delete globalThis[name]
        }
      }
    },
  }
}

test('indicator follows the active DOM button, including a newly configured page and variable widths', () => {
  const h = harness()
  try {
    assert.equal(h.render().indicator, null)
    assert.deepEqual(h.render().indicator, { left: 0, top: 0, width: 52, height: 36 })
    assert.deepEqual(h.select('music'), { left: 60, top: 0, width: 72, height: 36 })
    h.buttons.push({ id: 'future-page', offsetLeft: 140, offsetTop: 0, offsetWidth: 108, offsetHeight: 40 })
    assert.deepEqual(h.select('future-page'), { left: 140, top: 0, width: 108, height: 40 })
    assert(h.buttons.every(button => h.observers.at(-1).targets.has(button)))
    assert.equal(h.select('no-active-page'), null)
  } finally { h.cleanup() }
})

test('font resizing and mobile column layout remeasure the same active button without stale positions', () => {
  const h = harness()
  try {
    h.render(); h.select('music')
    h.buttons[0].offsetWidth = 90
    h.buttons[1].offsetLeft = 98
    assert.equal(h.resize().left, 98)
    Object.assign(h.buttons[1], { offsetLeft: 0, offsetTop: 44, offsetWidth: 358, offsetHeight: 36 })
    assert.deepEqual(h.windowResize(), { left: 0, top: 44, width: 358, height: 36 })
    const stable = h.render().indicator
    assert.strictEqual(h.resize(), stable)
  } finally { h.cleanup() }
})

test('closed mobile menus wait for measurable geometry, then position correctly when opened', () => {
  const h = harness()
  try {
    h.buttons.forEach(button => Object.assign(button, { offsetWidth: 0, offsetHeight: 0 }))
    h.render(); assert.equal(h.render().indicator, null)
    Object.assign(h.buttons[0], { offsetWidth: 358, offsetHeight: 36 })
    assert.deepEqual(h.open(), { left: 0, top: 0, width: 358, height: 36 })
  } finally { h.cleanup() }
})
