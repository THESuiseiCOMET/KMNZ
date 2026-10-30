import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/MusicFilterGroup.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
function harness() {
  const refs = [], pending = []
  let cursor = 0, measurement = null
  const jsx = (type, props) => ({ type, props })
  const hooks = { useRef(value) { const i = cursor++; return refs[i] ??= { current: value } }, useLayoutEffect(fn) { pending.push(fn) } }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => name === 'react' ? hooks : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { useNavigationIndicator: () => ({ linksRef: { current: null }, indicator: measurement }) }, module, module.exports)
  return { render(props, bounds = null) { cursor = 0; measurement = bounds; const result = module.exports.default(props); pending.splice(0).forEach(fn => fn()); return result } }
}

test('deselecting a filter retains the measured pill bounds so it can fade away without jumping to zero', () => {
  const h = harness(), calls = []
  const props = { label: 'YouTube 分类', options: [['original', '原创'], ['cover', '翻唱']], active: null, onChange: value => calls.push(value) }
  const first = h.render(props)
  assert(!first.props.children[0].props.className.includes('is-visible'))
  const bounds = { width: 68, height: 36, left: 72, top: 0 }
  const selected = h.render({ ...props, active: 'cover' }, bounds)
  assert(selected.props.children[0].props.className.includes('is-visible'))
  const cleared = h.render(props)
  const pill = cleared.props.children[0]
  assert(!pill.props.className.includes('is-visible')); assert.equal(pill.props.style.width, 68)
  assert.equal(pill.props.style.transform, 'translate(72px, 0px) scale(0.94)')
  const buttons = selected.props.children[1].props.children
  assert.equal(buttons[1].props['aria-pressed'], true)
  buttons[1].props.onClick(); buttons[0].props.onClick()
  assert.deepEqual(calls, ['cover', 'original'])
})

test('filter pills follow changed widths and wrapped rows while exposing native keyboard buttons', () => {
  const h = harness()
  const props = { label: '原创分类', options: [['lita-liz', 'LITA & LIZ'], ['lita-tina-nero', 'LITA & TINA & NERO']], active: 'lita-liz', onChange() {}, secondary: true }
  h.render(props, { width: 92, height: 36, left: 0, top: 0 })
  const second = h.render({ ...props, active: 'lita-tina-nero' }, { width: 160, height: 36, left: 0, top: 40 })
  assert.equal(second.props.role, 'group'); assert.equal(second.props['aria-label'], '原创分类')
  assert(second.props.className.includes('music-subcategories'))
  assert.equal(second.props.children[0].props.style.transform, 'translate(0px, 40px) scale(1)')
  assert.equal(second.props.children[0].props.style.width, 160)
  for (const button of second.props.children[1].props.children) assert.equal(button.type, 'button')
})
