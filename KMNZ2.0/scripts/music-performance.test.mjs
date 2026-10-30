import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { loadTypeScript } from './load-typescript.mjs'

const library = (await loadTypeScript(new URL('../src/data/musicLibrary.ts', import.meta.url))).musicLibrary
const catalog = (await loadTypeScript(new URL('../src/data/music.ts', import.meta.url))).musicCatalog
const data = await loadTypeScript(new URL('../src/data/musicMetadata.ts', import.meta.url))
const viewModel = await loadTypeScript(new URL('../src/lib/musicViews.ts', import.meta.url))
const queue = await loadTypeScript(new URL('../src/lib/playbackQueue.ts', import.meta.url))
const routes = await loadTypeScript(new URL('../src/lib/siteRoute.ts', import.meta.url))
const model = await loadTypeScript(new URL('../src/lib/musicLibrary.ts', import.meta.url))

test('date sorting does not construct a formatter or format display labels, and preserves epoch, precision and stable unknown dates', async () => {
  const original = Intl.DateTimeFormat
  let constructions = 0
  Intl.DateTimeFormat = new Proxy(original, { construct(target, args) { constructions++; return Reflect.construct(target, args) } })
  try {
    const helpers = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
    const known = catalog.find(entry => entry.platform === 'youtube')
    const entries = ['unknown', 'epoch', 'later', 'same'].map(id => ({ ...known, id }))
    const proof = { source: 'manual', status: 'verified', verifiedAt: '2026-10-30T00:00:00Z', sourceUrl: known.externalUrl }
    const manual = Object.fromEntries(entries.slice(1).map(entry => [entry.id, { platformId: entry.platformId, publishedAt: { value: entry.id === 'epoch' ? '1970-01-01T00:00:00Z' : '2024-12-31T16:30:00Z', ...proof } }]))
    assert.deepEqual(helpers.sortMusicEntries(entries, {}, manual).map(entry => entry.id), ['later', 'same', 'epoch', 'unknown'])
    assert.equal(constructions, 0)
    for (const entry of entries.slice(1)) helpers.musicDate(entry, helpers.resolveMetadata(entry, {}, manual))
    assert.equal(constructions, 1)
    assert.equal(helpers.musicDate(entries[2], helpers.resolveMetadata(entries[2], {}, manual)).label, '2025.01.01')
    const spotify = catalog.find(entry => entry.platform === 'spotify')
    for (const [precision, value] of [['year', '2024'], ['month', '2024-05'], ['day', '2024-05-06']]) {
      const metadata = helpers.resolveMetadata(spotify, {}, { [spotify.id]: { platformId: spotify.platformId, releaseDate: { value, precision, ...proof } } })
      assert.equal(helpers.musicDate(spotify, metadata).label, value.replaceAll('-', '.'))
    }
  } finally { Intl.DateTimeFormat = original }
})

test('static card data is reused across visits without mixing objects with different platform identities', () => {
  const known = catalog.find(entry => entry.platform === 'youtube')
  assert.equal(data.getMusicMetadata(known), data.getMusicMetadata(known))
  assert.equal(data.getMusicDate(known), data.getMusicDate(known))
  const different = { ...known, platformId: 'AAAAAAAAAAA' }
  assert.equal(data.getMusicDate(different), null)
  assert.equal(data.getMusicMetadata(different).platformId, 'AAAAAAAAAAA')
  assert(data.getMusicDate(known))
})

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/pages/Music.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
function harness() {
  let cursor = 0, metadataReads = 0, youtubeReads = 0, spotifyReads = 0
  const slots = []
  const react = {
    useState(value) { const i = cursor++; slots[i] ??= { value }; return [slots[i].value, next => { slots[i].value = next }] },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value } },
    useEffect() {},
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, index) => !Object.is(value, slots[i].deps[index]))) slots[i] = { deps, value: fn() }; return slots[i].value },
  }
  const module = { exports: {} }
  const viewFactory = { createMusicViews(...args) { const views = viewModel.createMusicViews(...args); return { ...views, youtubeCards(...args) { youtubeReads++; return views.youtubeCards(...args) }, spotifyCards(...args) { spotifyReads++; return views.spotifyCards(...args) } } } }
  const imports = { react, '../data/music': { musicCatalog: catalog }, '../data/musicLibrary': { musicLibrary: library }, '../lib/musicViews': viewFactory, '../lib/playbackQueue': queue,
    '../lib/siteRoute': routes, '../lib/musicLibrary': model, '../data/musicMetadata': { ...data, getMusicMetadata(entry) { metadataReads++; return data.getMusicMetadata(entry) } },
    '../hooks/useNavigationIndicator': { useNavigationIndicator: () => ({ linksRef: { current: null }, indicator: null }) } }
  new Function('require', 'module', 'exports', compiled)(name => imports[name] ?? (name.endsWith('.svg') ? 'icon.svg' : name.includes('/components/') ? () => null : require(name)), module, module.exports)
  return { render(props) { cursor = 0; return module.exports.default(props) }, counts: () => ({ metadataReads, youtubeReads, spotifyReads }) }
}
const grid = tree => {
  if (!tree || typeof tree !== 'object') return null
  if (tree.props?.className === 'music-grid') return tree
  for (const child of [tree.props?.children].flat(Infinity)) { const value = grid(child); if (value) return value }
  return null
}

test('indicator-only rerenders reuse all card nodes while search, selected state and playback callbacks stay current', () => {
  const h = harness(), selected = []
  const props = { route: { ...routes.defaultMusicRoute }, selectedId: null, onSelect: selection => selected.push(selection) }
  const first = grid(h.render(props)).props.children
  const before = h.counts()
  const second = grid(h.render(props)).props.children
  assert.equal(first, second)
  assert.deepEqual(h.counts(), before)
  const video = first[0]
  video.props.children[0].props.children[1].props.onClick()
  assert.equal(selected[0].items[selected[0].index].sourceId, video.key)
  const changed = grid(h.render({ ...props, selectedId: video.key })).props.children
  assert.notEqual(changed, first)
  assert(changed[0].props.className.includes(' selected'))
  const searched = grid(h.render({ ...props, route: { ...props.route, search: 'WAVE' } })).props.children
  assert.equal(searched.length, 1)
  searched[0].props.children[0].props.children[1].props.onClick()
  assert.equal(selected.at(-1).origin.kind, 'search')
  assert.equal(selected.at(-1).items.length, 1)
})

test('inactive platforms do not build or sort hidden lists', () => {
  for (const platform of ['youtube', 'spotify']) {
    const h = harness()
    h.render({ route: { ...routes.defaultMusicRoute, platform }, selectedId: null, onSelect() {} })
    assert.equal(h.counts().youtubeReads, Number(platform === 'youtube'))
    assert.equal(h.counts().spotifyReads, Number(platform === 'spotify'))
  }
})

function findNode(tree,predicate){
  if(!tree||typeof tree!=='object')return null
  if(predicate(tree))return tree
  for(const child of [tree.props?.children].flat(Infinity)){const found=findNode(child,predicate);if(found)return found}
  return null
}
test('Spotify cover opens a panel while its title stays plain and its play button preserves list playback',()=>{
  const h=harness(),changed=[],selected=[]
  const props={route:{...routes.defaultMusicRoute,platform:'spotify',category:'ep',search:'DROPS'},selectedId:null,onRouteChange:next=>changed.push(next),onSelect:selection=>selected.push(selection)}
  const tree=h.render(props),card=grid(tree).props.children.find(node=>node.key==='sp-drops')
  assert(card)
  const heading=findNode(card,node=>node.type==='h3')
  assert.equal(heading.props.children,'DROPS')
  const cover=findNode(card,node=>node.props?.['aria-label']==='展开 DROPS 曲目')
  assert.equal(cover.props['aria-expanded'],false)
  cover.props.onClick()
  assert.equal(changed[0].releaseSourceId,'sp-drops');assert.equal(changed[0].search,'DROPS');assert.equal(changed[0].category,'ep')
  const play=findNode(card,node=>node.props?.className==='music-cover-play')
  play.props.onClick();assert.equal(changed.length,1)
  assert.equal(selected[0].items[selected[0].index].sourceId,'sp-drops')
  const opened=h.render({...props,route:changed[0]})
  assert.equal(grid(opened).props.children.length,1)
  const pane=findNode(opened,node=>node.props?.id==='music-release-pane')
  assert(pane)
  const detail=pane.props.children.props
  assert.deepEqual(detail.detail.tracks.map(track=>track.song.title),['DROP IN','GROWL','MIRROR'])
  detail.onSelect(detail.detail.tracks[1].playback,{discNumber:1,trackNumber:2})
  assert.equal(selected[1].origin.kind,'album');assert.equal(selected[1].index,1)
  assert.equal(selected[1].items[1].sourceId,detail.detail.tracks[1].playback.id)
  detail.onBack();assert.equal(changed.at(-1).releaseSourceId,null);assert.equal(changed.at(-1).search,'DROPS')
})
