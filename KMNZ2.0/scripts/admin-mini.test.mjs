import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import { get as httpGet } from 'node:http'
import ts from 'typescript'
import { loadTypeScript } from './load-typescript.mjs'
import { youtubeId, bilibiliLink, collectVideos, prepareBatch, assertRemoteIncludesLocal, sourceIdFor, songIdFor,
  createAdmin, publishBatch, loadSnapshot, dataPaths, AdminError, runCommand, commandFailure, createAdminTransport, adminYouTubeRequest } from '../admin/server.mjs'

const helpers = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const model = await loadTypeScript(new URL('../src/lib/musicLibrary.ts', import.meta.url))
const existingId = 'MehG9Ms8ygU', newId = 'AbCdEfGhI12', secondId = 'XyZabcdef12'
const now = '2026-11-02T02:00:00Z', publishedAt = '2026-01-01T16:30:06Z'
const bv = 'BV1GJ411x7h7', secondBV = 'BV1xx411c7mD'
const raw = (videoId = newId) => ({ videoId, apiTitle: 'API title', publishedAt, duration: 'PT3M42S', verifiedAt: now, channelId: 'UC-example', channelTitle: 'KMNZ' })
const review = (videoId = newId, patch = {}) => ({ videoId, selected: true, title: 'Reviewed title', artist: 'KMNZ', contentType: 'cover', members: ['LITA', 'TINA', 'NERO'], era: 'new', originalGroup: '', songId: '', ...patch })
const baseData = () => ({
  songs: [{ id: 'song-existing', title: 'Existing', artist: 'KMNZ', version: { kind: 'unspecified' } }], releases: [],
  sources: [{ id: 'yt-existing', platform: 'youtube', kind: 'mv', platformId: existingId, externalUrl: 'https://www.youtube.com/watch?v=' + existingId,
    display: { subtitle: 'Original · KMNZ', year: 2025, era: 'new' }, target: { type: 'song', songId: 'song-existing' } }],
  automatic: { 'yt-existing': { platformId: existingId, publishedAt: { value: '2025-05-24T12:00:00Z', source: 'youtube-data-api', status: 'verified', verifiedAt: now, sourceUrl: 'https://www.youtube.com/watch?v=' + existingId } } }, manual: {},
})
const responseVideo = id => ({ id, snippet: { title: 'API title', publishedAt, channelId: 'UC-example', channelTitle: 'KMNZ' }, contentDetails: { duration: 'PT3M42S' }, status: { embeddable: true, privacyStatus: 'public' } })
const htmlSource = await readFile(new URL('../admin/index.html', import.meta.url), 'utf8')

async function temporary() {
  const root = await mkdtemp(join(tmpdir(), 'kmnz-admin-test-'))
  return { root, async cleanup() {
    assert.equal(dirname(resolve(root)), resolve(tmpdir())); assert(basename(root).startsWith('kmnz-admin-test-'))
    await rm(root, { recursive: true, force: true })
  } }
}
async function writeProject(root, data) {
  const values = [data.songs, data.releases, data.sources, data.automatic, data.manual]
  for (let i = 0; i < dataPaths.length; i++) { await mkdir(dirname(join(root, dataPaths[i])), { recursive: true }); await writeFile(join(root, dataPaths[i]), JSON.stringify(values[i], null, 2) + '\n') }
}
const environmentRunner = async (cmd, args) => {
  if (cmd === 'gh') throw new AdminError('fixture: missing gh')
  if (args.includes('user.name')) return 'Tester'
  if (args.includes('user.email')) return 'tester@example.invalid'
  return 'git version fixture'
}

test('YouTube accepts video URLs only, normalizes Shorts/live, and never expands playlists or hostile URLs', () => {
  for (const url of ['https://youtu.be/' + newId, 'https://www.youtube.com/watch?v=' + newId + '&list=anything', 'https://www.youtube.com/shorts/' + newId, 'https://www.youtube.com/live/' + newId]) assert.equal(youtubeId(url), newId)
  for (const url of ['https://www.youtube.com/playlist?list=test', 'https://evil.example/watch?v=' + newId, 'https://www.youtube.com.evil.example/watch?v=' + newId, 'http://www.youtube.com/watch?v=' + newId, 'https://user@www.youtube.com/watch?v=' + newId]) assert.throws(() => youtubeId(url))
})

test('existing and repeated videos are skipped without an API key; unlisted library entries stay protected', async () => {
  const data = baseData(); data.sources[0].listed = false
  const result = await collectVideos(['https://youtu.be/' + existingId, 'https://youtu.be/' + existingId].join('\n'), data, [], { apiKey: '', request() { assert.fail('No API call expected') } })
  assert.equal(result.videos.length, 0); assert.equal(result.notices.length, 2)
  await assert.rejects(collectVideos('https://youtu.be/' + newId, data, [], { apiKey: '' }), /YOUTUBE_API_KEY/)
})

test('official video requests are batched by 50 and preserve original timestamps and duration', async () => {
  const ids = Array.from({ length: 101 }, (_, i) => 'v' + String(i).padStart(10, '0')), sizes = []
  const result = await collectVideos(ids.map(id => 'https://youtu.be/' + id).join('\n'), baseData(), [], { apiKey: 'not-a-real-key', now,
    request: async (method, params) => { assert.equal(method, 'videos'); assert.equal(params.part, 'snippet,contentDetails,status'); const batch = params.id.split(','); sizes.push(batch.length); return { items: batch.map(responseVideo) } } })
  assert.deepEqual(sizes, [50, 50, 1]); assert.equal(result.videos.length, 101)
  assert(result.videos.every(video => video.publishedAt === publishedAt && video.duration === 'PT3M42S' && video.verifiedAt === now))
})

test('missing dates, invalid durations, unavailable video and API failures cannot become publishable records', async () => {
  for (const mutate of [video => delete video.snippet.publishedAt, video => video.snippet.publishedAt = '2026', video => video.contentDetails.duration = 'PT0S', video => video.status.embeddable = false]) {
    const item = responseVideo(newId); mutate(item)
    const result = await collectVideos('https://youtu.be/' + newId, baseData(), [], { apiKey: 'fixture', request: async () => ({ items: [item] }) })
    assert.equal(result.videos.length, 0); assert.equal(result.notices.length, 1)
  }
  await assert.rejects(collectVideos('https://youtu.be/' + newId, baseData(), [], { apiKey: 'fixture-secret', request: async () => { throw Error('fixture-secret') } }), error => !error.message.includes('fixture-secret') && /API/.test(error.message))
  assert.throws(() => prepareBatch(baseData(), [{ ...raw(), publishedAt: '' }], [review()], []), /发布时间/)
  assert.throws(() => prepareBatch(baseData(), [], [review()], []), /服务器获取/)
})

test('new metadata passes the actual frontend loader/date cache, keeps UTC and Tokyo conversion, and cannot be replaced by client input', async () => {
  const base = baseData()
  base.manual['yt-existing'] = { platformId: existingId, publishedAt: { ...base.automatic['yt-existing'].publishedAt, value: '2025-06-01T00:00:00Z', source: 'manual' } }
  const before = structuredClone(base)
  const plan = prepareBatch(base, [raw()], [review(newId, { publishedAt: now })], [])
  assert.deepEqual(base, before)
  const source = plan.data.sources.find(source => source.platformId === newId)
  assert.equal(source.id, sourceIdFor(newId)); assert.equal(source.target.songId, songIdFor(newId))
  assert.equal(plan.data.songs.at(-1).version.kind, 'unspecified')
  assert.equal(source.classification.contentType, 'cover'); assert.equal(source.display.year, 2026)
  assert(!('publishedAt' in source)); assert(!('duration' in source)); assert(!('duration' in plan.data.automatic[source.id]))
  const loader = await readFile(new URL('../src/data/musicMetadata.ts', import.meta.url), 'utf8'), module = { exports: {} }
  const code = ts.transpileModule(loader, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === './music-metadata.json' ? plan.data.automatic : name === './music-metadata.overrides.json' ? plan.data.manual : helpers, module, module.exports)
  const catalog = model.toMusicCatalog({ schemaVersion: 1, songs: plan.data.songs, releases: plan.data.releases, sources: plan.data.sources }), entry = catalog.find(entry => entry.id === source.id)
  assert.equal(module.exports.getMusicMetadata(entry).publishedAt.value, publishedAt)
  assert.equal(module.exports.getMusicDate(entry).label, '2026.01.02')
  assert.equal(module.exports.getMusicDate(entry).dateTime, publishedAt)
  assert.deepEqual(plan.data.automatic['yt-existing'], base.automatic['yt-existing']); assert.deepEqual(plan.data.manual, base.manual)
  assert.deepEqual(plan.files.map(file => file.path).sort(), [dataPaths[0], dataPaths[2], dataPaths[3]].sort())
})

test('explicit recording associations reuse songs without renaming them; same-batch song associations also work', () => {
  const base = baseData(), linked = prepareBatch(base, [raw()], [review(newId, { songId: 'song-existing', title: 'Do not rename existing' })], [])
  assert.equal(linked.data.songs.length, 1); assert.equal(linked.review.items[0].title, 'Existing')
  const batch = prepareBatch(base, [raw(), raw(secondId)], [review(), review(secondId, { songId: songIdFor(newId) })], [])
  assert.equal(batch.data.songs.length, 2); assert.equal(batch.data.sources.at(-1).target.songId, songIdFor(newId))
  assert.throws(() => prepareBatch(base, [raw()], [review(newId, { members: [] })], []), /成员/)
  assert.throws(() => prepareBatch(base, [raw()], [review(newId, { contentType: 'original' })], []), /原创组别/)
})

test('Bilibili binds only the selected existing or new YouTube source and strips tracking parameters', () => {
  const base = baseData(), before = structuredClone(base)
  const binding = { sourceId: 'yt-existing', url: 'https://www.bilibili.com/video/' + bv + '/?spm_id_from=333' }
  const result = prepareBatch(base, [], [], [binding])
  assert.deepEqual(result.files.map(file => file.path), [dataPaths[2]])
  assert.equal(result.data.sources[0].bilibiliUrl, 'https://www.bilibili.com/video/' + bv)
  assert.deepEqual(base, before)
  const added = prepareBatch(base, [raw()], [review()], [{ sourceId: sourceIdFor(newId), url: bv }])
  assert.equal(added.data.sources.at(-1).bilibiliUrl, 'https://www.bilibili.com/video/' + bv)
  assert.equal(added.data.sources[0].bilibiliUrl, undefined)
  assert.throws(() => prepareBatch(base, [], [], [{ sourceId: 'song-existing', url: bv }]), /YouTube 来源/)
})

test('duplicate BV, duplicate target and existing binding conflicts are blocked; identical bindings are a no-op', () => {
  const base = baseData(), existing = { sourceId: 'yt-existing', url: bv }, newer = { sourceId: sourceIdFor(newId), url: bv }
  assert.throws(() => prepareBatch(base, [raw()], [review()], [existing, newer]), /重复/)
  assert.throws(() => prepareBatch(base, [], [], [existing, { ...existing, url: secondBV }]), /重复/)
  base.sources[0].bilibiliUrl = 'https://www.bilibili.com/video/' + bv + '/?spm=1'
  assert.equal(prepareBatch(base, [], [], [existing]).files.length, 0)
  assert.throws(() => prepareBatch(base, [raw()], [review()], [newer]), /其他来源/)
  assert.throws(() => prepareBatch(base, [], [], [{ ...existing, url: secondBV }]), /不覆盖/)
  for (const input of ['https://b23.tv/example', 'http://www.bilibili.com/video/' + bv, 'https://www.bilibili.com/video/av1234', 'https://evil.example/video/' + bv]) assert.throws(() => bilibiliLink(input))
})

test('remote baseline guard checks identities, classification, manual overrides and effective exact dates', () => {
  const local = baseData(), same = structuredClone(local)
  assert.doesNotThrow(() => assertRemoteIncludesLocal(local, same))
  const old = structuredClone(local); old.sources = []; old.automatic = {}
  assert.throws(() => assertRemoteIncludesLocal(local, old), /远端基线/)
  const missingDate = structuredClone(local); missingDate.automatic = {}
  assert.throws(() => assertRemoteIncludesLocal(local, missingDate), /publishedAt/)
  const different = structuredClone(local); different.sources[0].display.subtitle = 'Changed'
  assert.throws(() => assertRemoteIncludesLocal(local, different), /内容不一致/)
  const manual = structuredClone(local); manual.manual['yt-existing'] = { platformId: existingId, publishedAt: null }
  assert.throws(() => assertRemoteIncludesLocal(manual, same), /人工清空/)
  const updated = structuredClone(local); updated.automatic['yt-existing'].publishedAt.verifiedAt = '2026-11-03T02:00:00Z'
  assert.doesNotThrow(() => assertRemoteIncludesLocal(local, updated))
})

async function fakePublication(t, { behind = false, lostPRResponse = false, testFailure = false, deleteBranchAfterPR = false } = {}) {
  const temporaryDir = await temporary(); t.after(() => temporaryDir.cleanup())
  const base = baseData(), repoRoot = join(temporaryDir.root, 'original'), project = join(repoRoot, 'KMNZ2.0'), storeDir = join(temporaryDir.root, 'state')
  await writeProject(project, base)
  const snapshot = await loadSnapshot(project), plan = prepareBatch(base, [raw()], [review()], []), batch = { id: randomUUID(), videos: [raw()], reviews: [review()], bindings: [] }
  const baseSha = 'a'.repeat(40), commitSha = 'b'.repeat(40), calls = []
  let pushed = null, pr = null, revs = 0, saved = 0
  const runner = async (cmd, args, options = {}) => {
    calls.push({ cmd, args, cwd: options.cwd, env: options.env, logFile: options.logFile })
    if (cmd === 'gh') {
      if (args[0] === 'repo') return JSON.stringify({ defaultBranchRef: { name: '真实默认分支' } })
      if (args[1] === 'list') return JSON.stringify(pr ? [pr] : [])
      if (args[1] === 'create') {
        assert(args.includes('--draft')); assert.equal(args[args.indexOf('--base') + 1], '真实默认分支')
        const body = await readFile(args[args.indexOf('--body-file') + 1], 'utf8')
        assert(body.includes(publishedAt)); assert(!body.includes('YOUTUBE_API_KEY'))
        pr = { url: 'https://github.com/THESuiseiCOMET/KMNZ/pull/99999', headRefOid: commitSha, baseRefName: '真实默认分支', body, state: 'OPEN', isDraft: true }
        if (deleteBranchAfterPR) pushed = null
        if (lostPRResponse) { lostPRResponse = false; throw new AdminError('simulated response lost') }
        return pr.url
      }
    }
    if (cmd === 'git') {
      if (args[0] === 'clone') {
        const workspace = args.at(-1), data = behind ? { ...structuredClone(base), sources: [], automatic: {} } : base
        await writeProject(join(workspace, 'KMNZ2.0'), data)
        await mkdir(join(workspace, 'KMNZ2.0/scripts')); await writeFile(join(workspace, 'KMNZ2.0/scripts/check.test.mjs'), '')
        return ''
      }
      if (args[0] === 'rev-parse') return ++revs === 1 ? baseSha : commitSha
      if (args[0] === 'diff') return plan.files.map(file => 'KMNZ2.0/' + file.path).join('\n')
      if (args[0] === 'ls-files') return ''
      if (args[0] === 'ls-remote') return args.at(-1).endsWith('真实默认分支') ? baseSha + '\trefs/heads/真实默认分支' : pushed ? pushed + '\trefs/heads/topic' : ''
      if (args[0] === 'config') return args[1] === 'user.name' ? 'Tester' : 'tester@example.invalid'
      if (args.includes('push')) { assert(!args.includes('--force')); pushed = commitSha; return '' }
      return ''
    }
    if (cmd === process.execPath) {
      assert.equal(options.env.YOUTUBE_API_KEY, ''); assert.equal(options.env.GH_TOKEN, ''); assert.equal(options.env.VITE_BASE_PATH, '/KMNZ/')
      if (args.includes('--test') && testFailure) throw new AdminError('simulated validation failure')
      return ''
    }
    assert.fail('Unexpected command')
  }
  const args = { batch, snapshot, plan, repoRoot, storeDir, runner, save: async () => { saved++ } }
  return { args, calls, project, base, get saved() { return saved } }
}

test('publisher uses dynamic default branch, only isolated data commits, Draft PR, and idempotent recovery after a lost response', async t => {
  const h = await fakePublication(t, { lostPRResponse: true, deleteBranchAfterPR: true })
  await assert.rejects(publishBatch(h.args), /response lost/)
  assert.equal(h.args.batch.publication.pushAttempted, true)
  const url = await publishBatch(h.args)
  assert.equal(url, 'https://github.com/THESuiseiCOMET/KMNZ/pull/99999')
  assert.equal(h.calls.filter(call => call.cmd === 'gh' && call.args[1] === 'create').length, 1)
  assert.equal(h.calls.filter(call => call.cmd === 'git' && call.args.includes('push')).length, 1)
  for (const call of h.calls.filter(call => call.cmd === 'git' && (call.args.includes('commit') || call.args[0] === 'add' || call.args.includes('push') || call.args[0] === 'checkout'))) assert(call.cwd.startsWith(h.args.storeDir))
  const add = h.calls.find(call => call.args[0] === 'add')
  assert.deepEqual(add.args.slice(2).sort(), h.args.plan.files.map(file => 'KMNZ2.0/' + file.path).sort())
  assert.equal((await loadSnapshot(h.project)).fingerprint, h.args.snapshot.fingerprint)
})

test('behind remote or failed validation stops before commit/push/PR and leaves user files unchanged', async t => {
  for (const options of [{ behind: true }, { testFailure: true }]) {
    const h = await fakePublication(t, options)
    await assert.rejects(publishBatch(h.args), options.behind ? /远端基线/ : /validation failure/)
    assert(!h.calls.some(call => call.args.includes('commit') || call.args.includes('push') || call.cmd === 'gh' && call.args[1] === 'create'))
    assert.equal((await loadSnapshot(h.project)).fingerprint, h.args.snapshot.fingerprint)
    assert(h.saved > 0); assert(h.args.batch.publication.workspace.startsWith(h.args.storeDir))
  }
})

test('HTTP local preview enforces Host/Origin/CSRF, hides secrets, binds current batch videos and persists recoverable drafts outside repo', async t => {
  const temp = await temporary(); t.after(() => temp.cleanup())
  const root = join(temp.root, 'repository/KMNZ2.0'), storeDir = join(temp.root, 'state')
  await writeProject(root, baseData()); await mkdir(join(root, 'admin')); await writeFile(join(root, 'admin/index.html'), htmlSource)
  let app = await createAdmin({ root, storeDir, port: 0, runner: environmentRunner, apiKey: 'fixture-secret', collect: async () => ({ videos: [raw()], notices: [] }) })
  t.after(() => app.close())
  const original = await loadSnapshot(root)
  const page = await (await fetch(app.origin)).text()
  assert(page.includes(app.csrf)); assert(!page.includes('fixture-secret')); assert(!page.includes('id="app-code"')); assert(page.includes('/app.js'))
  const scriptResponse = await fetch(app.origin + '/app.js'), script = await scriptResponse.text()
  assert.match(scriptResponse.headers.get('content-type'), /javascript/); assert(!script.includes('innerHTML')); new Function(ts.transpileModule(script, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)
  const read = await (await fetch(app.origin + '/api/state')).json()
  assert.equal(read.environment.canPublish, false); assert(!JSON.stringify(read).includes('fixture-secret'))
  const post = (path, value, headers = {}) => fetch(app.origin + '/api/' + path, { method: 'POST', headers: { Origin: app.origin, 'Content-Type': 'application/json', 'X-KMNZ-Token': app.csrf, ...headers }, body: JSON.stringify(value) })
  assert.equal((await post('new', {}, { Origin: 'https://evil.example' })).status, 400)
  assert.equal((await post('new', {}, { 'X-KMNZ-Token': 'wrong' })).status, 400)
  const wrongHostStatus = await new Promise((accept, reject) => httpGet(app.origin, { headers: { Host: 'evil.example' } }, response => { response.resume(); accept(response.statusCode) }).on('error', reject))
  assert.equal(wrongHostStatus, 400)
  assert.equal((await post('youtube', { input: 'https://youtu.be/' + newId })).status, 200)
  const preview = await (await post('preview', { reviews: [review()], bindings: [{ url: bv, sourceId: sourceIdFor(newId) }] })).json()
  assert.equal(preview.review.items[0].date, '2026.01.02'); assert.equal(preview.review.links.length, 1)
  assert(preview.reviewToken)
  assert.equal((await post('publish', { confirmed: false, reviewToken: preview.reviewToken })).status, 400)
  assert.equal((await post('publish', { confirmed: true, reviewToken: preview.reviewToken })).status, 400)
  assert.equal((await loadSnapshot(root)).fingerprint, original.fingerprint)
  assert(!await readFile(join(storeDir, 'active.json'), 'utf8').then(text => text.includes('fixture-secret')))
  const batchId = app.batch.id
  await app.close()
  app = await createAdmin({ root, storeDir, port: 0, runner: environmentRunner, apiKey: '' })
  assert.equal(app.batch.id, batchId); assert.equal(app.batch.videos.length, 1); assert(app.batch.reviewToken)
  assert.equal(app.batch.preview.items[0].publishedAt, publishedAt)
})

test('stale recovered batch can be archived by starting a fresh batch without deleting it', async t => {
  const temp = await temporary(); t.after(() => temp.cleanup())
  const root = join(temp.root, 'repository/KMNZ2.0'), storeDir = join(temp.root, 'state')
  await writeProject(root, baseData()); await mkdir(join(root, 'admin')); await writeFile(join(root, 'admin/index.html'), htmlSource)
  let app = await createAdmin({ root, storeDir, port: 0, runner: environmentRunner })
  const post = async (app, path, body) => (await fetch(app.origin + '/api/' + path, { method: 'POST', headers: { Origin: app.origin, 'Content-Type': 'application/json', 'X-KMNZ-Token': app.csrf }, body: JSON.stringify(body) })).json()
  await post(app, 'new', {}); const oldId = app.batch.id; await app.close()
  const data = baseData(); data.sources[0].display.subtitle = 'Locally changed'; await writeProject(root, data)
  app = await createAdmin({ root, storeDir, port: 0, runner: environmentRunner }); t.after(() => app.close())
  assert.equal((await (await fetch(app.origin + '/api/state')).json()).stale, true)
  await post(app, 'new', {}); assert.notEqual(app.batch.id, oldId)
  assert(JSON.parse(await readFile(join(storeDir, 'batches', oldId, 'draft.json'), 'utf8')).id === oldId)
})

test('failed child checks retain diagnostic logs without reflecting process output to the browser', async t => {
  const temp = await temporary(); t.after(() => temp.cleanup())
  const logFile = join(temp.root, 'check.log')
  await assert.rejects(runCommand(process.execPath, ['-e', 'console.error("fixture-diagnostic");process.exit(1)'], { logFile, timeout: 5000 }), error => error instanceof AdminError && !error.message.includes('fixture-diagnostic'))
  assert((await readFile(logFile, 'utf8')).includes('fixture-diagnostic'))
  for (const [file, stage] of [['install.log', '依赖安装'], ['tests.log', '项目测试'], ['build.log', '生产构建']]) {
    await assert.rejects(runCommand(process.execPath, ['-e', 'console.error("fixture-diagnostic");process.exit(1)'], { logFile: join(temp.root, file), timeout: 5000 }), error => error instanceof AdminError && error.message.includes(stage) && error.message.includes(file) && !error.message.includes('fixture-diagnostic'))
  }
})


test('Admin transport falls back only on network errors, not API authentication or quota responses', async () => {
  let primary = 0, fallback = 0
  const transport = createAdminTransport({ native: async () => { primary++; throw TypeError('network') }, windows: async () => { fallback++; return new Response('{}') } })
  assert.equal((await transport('https://www.googleapis.com')).status, 200)
  assert.equal(primary, 1); assert.equal(fallback, 1)
  const forbidden = createAdminTransport({ native: async () => new Response('{}', { status: 403 }), windows: async () => { assert.fail('HTTP errors must not be retried through another transport') } })
  assert.equal((await forbidden('https://www.googleapis.com')).status, 403)
})

test('Admin reports safe HTTP reasons without returning API response messages, request URLs or credentials', async () => {
  for (const [reason, status, expected] of [['quotaExceeded', 403, /配额/], ['API_KEY_INVALID', 400, /Key 无效/], ['API_KEY_HTTP_REFERRER_BLOCKED', 403, /网页来源/], ['SERVICE_DISABLED', 403, /未启用/]]) {
    const fetcher = async () => new Response(JSON.stringify({ error: { message: 'fixture-secret https://example.invalid/?key=fixture-secret', errors: [{ reason }], details: [{ reason }] } }), { status, headers: { 'content-type': 'application/json' } })
    await assert.rejects(adminYouTubeRequest('videos', { part: 'snippet', id: newId }, { apiKey: 'fixture-secret', fetcher, sleep: async () => {} }), error => {
      assert(error instanceof AdminError); assert.match(error.message, expected); assert.match(error.message, new RegExp('HTTP ' + status));
      assert(!error.message.includes('fixture-secret')); assert(!error.message.includes('https://'))
      return true
    })
  }
  await assert.rejects(adminYouTubeRequest('videos', {}, { apiKey: 'fixture-secret', fetcher: async () => { throw Error('fixture-secret') }, sleep: async () => {} }), error => /网络/.test(error.message) && !error.message.includes('fixture-secret'))
  await assert.rejects(adminYouTubeRequest('videos', {}, { apiKey: 'fixture-secret', fetcher: async () => new Response('not-json fixture-secret'), sleep: async () => {} }), error => /解析/.test(error.message) && !error.message.includes('fixture-secret'))
})

test('Admin Stream preserves verified dates and BV binding and emits only confirmed performer classification', () => {
  const base = baseData(), before = structuredClone(base)
  const plan = prepareBatch(base, [raw()], [review(newId, { contentType: 'stream', members: ['LITA', 'TINA', 'NERO'] })], [{ sourceId: sourceIdFor(newId), url: 'https://www.bilibili.com/video/' + bv }])
  const source = plan.data.sources.at(-1)
  assert.deepEqual(base, before)
  assert.equal(source.classification.contentType, 'stream')
  assert.deepEqual(source.classification.performers, ['lita', 'tina', 'nero'])
  assert(!('originalGroup' in source.classification)); assert(!('coverMembers' in source.classification))
  assert(source.display.subtitle.startsWith('Stream · '))
  assert.equal(source.bilibiliUrl, 'https://www.bilibili.com/video/' + bv)
  assert.equal(plan.data.automatic[source.id].publishedAt.value, publishedAt)
  assert.equal(plan.review.items[0].date, '2026.01.02')
  assert.equal(plan.data.songs.at(-1).version.kind, 'unspecified')
  assert(htmlSource.includes("['stream','Stream']"))
  assert.throws(() => prepareBatch(base, [raw()], [review(newId, { contentType: 'stream', members: ['LIZ'] })], []), /Stream 成员/)
  assert.throws(() => prepareBatch(base, [{ ...raw(), publishedAt: '' }], [review(newId, { contentType: 'stream' })], []), /发布时间/)
})

test('one running Admin reloads merged library data for consecutive batches without restart, preserving drafts and bulk settings', async t => {
  const temp = await temporary(); t.after(() => temp.cleanup())
  const root = join(temp.root, 'repository/KMNZ2.0'), storeDir = join(temp.root, 'state')
  await writeProject(root, baseData()); await mkdir(join(root, 'admin')); await writeFile(join(root, 'admin/index.html'), htmlSource)
  let requests = 0
  const collect = (input, data, prior) => collectVideos(input, data, prior, { apiKey: 'fixture', request: async (method, params) => { requests++; return { items: params.id.split(',').map(responseVideo) } } })
  const app = await createAdmin({ root, storeDir, port: 0, runner: environmentRunner, collect }); t.after(() => app.close())
  const post = async (path, body) => {
    const response = await fetch(app.origin + '/api/' + path, { method: 'POST', headers: { Origin: app.origin, 'Content-Type': 'application/json', 'X-KMNZ-Token': app.csrf }, body: JSON.stringify(body) })
    return { status: response.status, body: await response.json() }
  }
  await post('youtube', { input: 'https://youtu.be/' + newId })
  assert.equal((await post('preview', { reviews: [review()], bindings: [] })).status, 200)
  const oldBatch = structuredClone(app.batch), originalFingerprint = app.snapshot.fingerprint
  const mergedData = prepareBatch(baseData(), [raw()], [review()], []).data
  await writeProject(root, mergedData)
  assert.equal((await (await fetch(app.origin + '/api/state')).json()).stale, true)
  const blocked = await post('preview', { reviews: [review()], bindings: [] })
  assert.equal(blocked.status, 400); assert(blocked.body.error.includes('清空列表')); assert(blocked.body.error.includes('无需重启'))
  assert.equal(app.snapshot.fingerprint, originalFingerprint); assert.deepEqual(app.batch, oldBatch)
  const settings = { era: 'new', contentType: 'stream', members: ['TINA'], autoMembers: false }
  const next = await post('new', { settings })
  assert.equal(next.status, 200); assert.notEqual(next.body.batch.id, oldBatch.id); assert.equal(next.body.stale, false)
  assert(next.body.sources.some(source => source.videoId === newId))
  assert.equal(app.snapshot.fingerprint, (await loadSnapshot(root)).fingerprint)
  assert.deepEqual(JSON.parse(await readFile(join(storeDir, 'batches', oldBatch.id, 'draft.json'), 'utf8')), oldBatch)
  const duplicate = await post('youtube', { input: 'https://youtu.be/' + newId })
  assert.equal(duplicate.status, 200); assert.equal(duplicate.body.batch.videos.length, 0); assert.equal(requests, 1)
  assert(duplicate.body.batch.notices.some(notice => notice.reason.includes('曲库已收录')))
  const added = await post('youtube', { input: 'https://youtu.be/' + secondId })
  assert.equal(added.status, 200); assert.equal(added.body.batch.reviews[0].contentType, 'stream')
  assert.deepEqual(added.body.batch.reviews[0].members, ['TINA']); assert.equal(added.body.batch.reviews[0].artist, 'KMNZ TINA')
  const secondBatch = structuredClone(app.batch)
  const third = await post('new', {})
  assert.equal(third.status, 200); assert.notEqual(third.body.batch.id, secondBatch.id)
  assert.deepEqual(third.body.batch.defaults.members, ['TINA']); assert.equal(third.body.batch.defaults.contentType, 'stream')
  assert.deepEqual(JSON.parse(await readFile(join(storeDir, 'batches', secondBatch.id, 'draft.json'), 'utf8')), secondBatch)
  assert.equal((await loadSnapshot(root)).fingerprint, app.snapshot.fingerprint)
})

test('invalid local library prevents a new batch without overwriting the current draft or snapshot; correction works in the same process', async t => {
  const temp = await temporary(); t.after(() => temp.cleanup())
  const root = join(temp.root, 'repository/KMNZ2.0'), storeDir = join(temp.root, 'state')
  await writeProject(root, baseData()); await mkdir(join(root, 'admin')); await writeFile(join(root, 'admin/index.html'), htmlSource)
  const app = await createAdmin({ root, storeDir, port: 0, runner: environmentRunner }); t.after(() => app.close())
  const postNew = () => fetch(app.origin + '/api/new', { method: 'POST', headers: { Origin: app.origin, 'Content-Type': 'application/json', 'X-KMNZ-Token': app.csrf }, body: '{}' })
  assert.equal((await postNew()).status, 200)
  const before = structuredClone(app.batch), snapshot = app.snapshot, active = await readFile(join(storeDir, 'active.json'), 'utf8')
  await writeFile(join(root, dataPaths[2]), '{invalid JSON')
  const rejected = await postNew(); assert.equal(rejected.status, 500)
  assert.deepEqual(app.batch, before); assert.equal(app.snapshot, snapshot)
  assert.equal(await readFile(join(storeDir, 'active.json'), 'utf8'), active)
  assert.deepEqual(JSON.parse(await readFile(join(storeDir, 'batches', before.id, 'draft.json'), 'utf8')), before)
  await writeProject(root, baseData())
  const recovered = await postNew(); assert.equal(recovered.status, 200)
  const state = await recovered.json(); assert.equal(state.stale, false); assert.notEqual(state.batch.id, before.id)
})


test('Git errors identify their step and log without exposing diagnostics or credentials',()=>{
 const network=commandFailure('git',['clone','https://example.invalid/repo'],'fatal: unable to access fixture-secret: Failed to connect to github.com port 443','/fixture/git-01-clone.log')
 assert(network.retryableClone);assert.match(network.message,/GitHub 仓库克隆/);assert.match(network.message,/git-01-clone.log/);assert(!network.message.includes('fixture-secret'))
 for(const diagnostic of ['Authentication failed: fixture-secret','repository not found','No space left on device','Permission denied','invalid reference'])assert.equal(commandFailure('git',['clone'],diagnostic,'/fixture/git-01-clone.log').retryableClone,false)
 assert.equal(commandFailure('git',['push'],'Failed to connect','/fixture/git-20-push.log').retryableClone,false)
})

test('publisher retries one transient clone with separate logs and leaves partial destinations intact',async t=>{
 for(const scenario of ['recover','repeat-network','auth','partial']){
  const h=await fakePublication(t),original=h.args.runner,cloneLogs=[];let attempts=0
  h.args.runner=async(cmd,args,options)=>{
   if(cmd==='git'&&args[0]==='clone'){
    cloneLogs.push(options.logFile);attempts++
    if(attempts===1||scenario==='repeat-network'){
     if(scenario==='partial'){await mkdir(args.at(-1),{recursive:true});await writeFile(join(args.at(-1),'retain.txt'),'retained')}
     throw commandFailure(cmd,args,scenario==='auth'?'Authentication failed':'Failed to connect to github.com port 443',options.logFile)
    }
   }
   return original(cmd,args,options)
  }
  if(scenario==='recover')assert.match(await publishBatch(h.args),/pull\/99999/)
  else{
   await assert.rejects(publishBatch(h.args),/GitHub 仓库克隆/)
   assert(!h.calls.some(call=>call.args.includes('commit')||call.args.includes('push')))
  }
  assert.equal(attempts,['recover','repeat-network'].includes(scenario)?2:1)
  assert.equal(new Set(cloneLogs).size,attempts)
  for(const path of cloneLogs){assert(path.startsWith(h.args.storeDir));assert.match(basename(path),/^git-\d+-clone\.log$/)}
  if(scenario==='partial')assert.equal(await readFile(join(h.args.batch.publication.workspace,'retain.txt'),'utf8'),'retained')
  assert.equal((await loadSnapshot(h.project)).fingerprint,h.args.snapshot.fingerprint)
 }
})
