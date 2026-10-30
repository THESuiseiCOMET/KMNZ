import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { loadContext } from './discover-music.mjs'
import { emptyCandidates, apiUrl, serialize } from './discovery/core.mjs'
import { publishReview, reviewBranch, baseBranch, reviewPath, marker, githubClient } from './publish-music-review.mjs'

const context = await loadContext(), source = context.config.youtube.channels[0]
const keySha = value => String(value).padStart(40, '0')
function candidate(id = 'NewVideo001') {
  return {
    key: 'youtube:video:' + id, platform: 'youtube', kind: 'video', platformId: id, officialSourceId: source.id,
    sourceUrl: 'https://www.youtube.com/watch?v=' + id, discoveredAt: '2026-10-29T06:00:00Z',
    raw: { id, title: 'WAVE', description: null, publishedAt: '2026-10-29T01:00:00Z', channelId: source.channelId, channelTitle: 'KMNZ', categoryId: '10', liveBroadcastContent: 'none', duration: 'PT3M', privacyStatus: 'public', embeddable: true },
    evidence: { provider: 'youtube-data-api', channelUrl: source.channelUrl, uploadsPlaylistId: 'UU' + source.channelId.slice(2),
      channelsApiUrl: apiUrl('channels', { part: 'contentDetails', id: source.channelId }),
      playlistApiUrl: apiUrl('playlistItems', { part: 'contentDetails', playlistId: 'UU' + source.channelId.slice(2), maxResults: 50 }),
      videoApiUrl: apiUrl('videos', { part: 'snippet,contentDetails,status', id }) },
    cover: null, review: { status: 'pending', note: '' },
  }
}
function github() {
  let counter = 10
  const base = keySha(1), baseTree = keySha(2)
  const files = Object.fromEntries([...context.originals].map(([path, text]) => ['KMNZ2.0/' + path, text]))
  files['README.md'] = 'unchanged base readme'
  const trees = new Map([[baseTree, files]]), commits = new Map([[base, { sha: base, tree: { sha: baseTree }, parents: [], message: 'base' }]])
  const refs = new Map([[baseBranch, base]]), prs = [], writes = []
  const next = () => keySha(counter++)
  const api = async (method, path, body, optional) => {
    if (method !== 'GET') writes.push({ method, path, body: structuredClone(body) })
    if (method === 'GET' && path.startsWith('/git/ref/heads/')) {
      const branch = decodeURIComponent(path.slice('/git/ref/heads/'.length)), ref = refs.get(branch)
      if (!ref && optional) return null
      assert(ref, branch)
      return { object: { sha: ref } }
    }
    if (method === 'GET' && path.startsWith('/git/commits/')) return structuredClone(commits.get(path.split('/').pop()))
    if (method === 'GET' && path.startsWith('/contents/')) {
      const url = new URL(path, 'https://fixture.test'), file = url.pathname.slice('/contents/'.length)
      const content = trees.get(commits.get(url.searchParams.get('ref'))?.tree.sha)?.[file]
      if (content === undefined && optional) return null
      assert.notEqual(content, undefined, file)
      return { encoding: 'base64', content: Buffer.from(content).toString('base64') }
    }
    if (method === 'GET' && path.startsWith('/pulls?')) return structuredClone(prs.slice().reverse())
    if (method === 'POST' && path === '/git/trees') {
      const tree = { ...trees.get(body.base_tree) }, id = next()
      assert.deepEqual(body.tree.map(entry => entry.path), [reviewPath])
      for (const entry of body.tree) tree[entry.path] = entry.content
      trees.set(id, tree); return { sha: id }
    }
    if (method === 'POST' && path === '/git/commits') {
      const id = next(); commits.set(id, { sha: id, tree: { sha: body.tree }, parents: body.parents, message: body.message }); return { sha: id }
    }
    if (method === 'POST' && path === '/git/refs') {
      assert.equal(body.ref, 'refs/heads/' + reviewBranch)
      assert(!refs.has(reviewBranch)); refs.set(reviewBranch, body.sha); return {}
    }
    if (method === 'PATCH' && path.startsWith('/git/refs/heads/')) {
      assert.equal(decodeURIComponent(path.slice('/git/refs/heads/'.length)), reviewBranch)
      assert.equal(body.force, false)
      assert(commits.get(body.sha).parents.includes(refs.get(reviewBranch)), 'fast-forward only')
      refs.set(reviewBranch, body.sha); return {}
    }
    if (method === 'POST' && path === '/pulls') {
      assert.equal(body.head, reviewBranch); assert.equal(body.base, baseBranch); assert.equal(body.draft, true)
      assert(body.body.includes(marker)); assert(!prs.some(pr => pr.state === 'open'))
      const pr = { ...body, state: 'open', merged_at: null, html_url: 'https://github.com/THESuiseiCOMET/KMNZ/pull/' + (prs.length + 1) }
      prs.push(pr); return pr
    }
    throw new Error('Unexpected fixture API call: ' + method + ' ' + path)
  }
  const headFiles = () => trees.get(commits.get(refs.get(reviewBranch)).tree.sha)
  return { api, writes, refs, prs, trees, commits, base, files, headFiles }
}
const collect = additions => async ({ previous }) => {
  const document = structuredClone(previous)
  for (const item of additions) if (!document.candidates.some(existing => existing.key === item.key)) document.candidates.push(item)
  document.candidates.sort((a, b) => a.key.localeCompare(b.key))
  return { document, report: { status: 'ok', added: document.candidates.length - previous.candidates.length } }
}
const publish = (git, options = {}) => publishReview({ context, api: git.api, collect: collect([candidate()]), ...options })

test('first run creates one draft review PR, writes only the candidate path and never updates publishing branch', async () => {
  const git = github(), result = await publish(git)
  assert.equal(result.status, 'created-review'); assert.equal(git.prs.length, 1)
  assert.equal(git.refs.get(baseBranch), git.base)
  for (const [path, text] of Object.entries(git.files)) if (path !== reviewPath) assert.equal(git.headFiles()[path], text)
  assert.equal(git.headFiles()['README.md'], git.files['README.md'])
  assert(git.writes.every(write => !write.path.includes('/merge')))
})

test('identical reruns produce neither a new commit, branch update, PR edit nor duplicate PR', async () => {
  const git = github()
  const first = await publish(git), count = git.writes.length, head = git.refs.get(reviewBranch)
  const second = await publish(git)
  assert.equal(second.status, 'unchanged'); assert.equal(second.pr, first.pr)
  assert.equal(git.writes.length, count); assert.equal(git.refs.get(reviewBranch), head)
  assert.equal(git.prs.length, 1)
})

test('new discoveries update the same open PR while preserving human edits, candidate notes and overrides', async () => {
  const git = github(); await publish(git)
  const files = git.headFiles(), document = JSON.parse(files[reviewPath])
  document.candidates[0].review = { status: 'dismissed', note: 'Human reviewed, do not overwrite' }
  files[reviewPath] = serialize(document)
  files['KMNZ2.0/src/data/music-metadata.overrides.json'] = 'human changes on review branch'
  files['human-added.txt'] = 'preserve this file'
  const result = await publish(git, { collect: collect([candidate(), candidate('NewVideo002')]) })
  assert.equal(result.status, 'updated-review'); assert.equal(git.prs.length, 1)
  assert.equal(JSON.parse(git.headFiles()[reviewPath]).candidates[0].review.note, document.candidates[0].review.note)
  assert.equal(git.headFiles()['human-added.txt'], 'preserve this file')
  assert.equal(git.headFiles()['KMNZ2.0/src/data/music-metadata.overrides.json'], 'human changes on review branch')
})

test('API discovery failure, missing credentials and invalid candidates never mutate GitHub', async () => {
  for (const collector of [async () => { throw new Error('provider failed') }, async () => ({ document: { ...emptyCandidates(), candidates: [{ songId: 'invented' }] }, report: { status: 'ok' } })]) {
    const git = github()
    await assert.rejects(publish(git, { collect: collector }))
    assert.equal(git.writes.length, 0)
  }
  const git = github()
  const result = await publish(git, { collect: async ({ previous }) => ({ document: previous, report: { status: 'no-credentials' } }) })
  assert.equal(result.status, 'no-credentials'); assert.equal(git.writes.length, 0)
  const noCandidates = github()
  assert.equal((await publish(noCandidates, { collect: collect([]) })).status, 'unchanged')
  assert.equal(noCandidates.writes.length, 0)
})

test('closed unmerged review is not recreated; unmanaged branch/PR, stale checkout and concurrent updates fail safely', async () => {
  const closed = github(); await publish(closed); closed.prs[0].state = 'closed'
  const count = closed.writes.length
  assert.equal((await publish(closed)).status, 'closed-review')
  assert.equal(closed.writes.length, count)
  const unmanaged = github(); unmanaged.refs.set(reviewBranch, unmanaged.base)
  await assert.rejects(publish(unmanaged), /Unmanaged/); assert.equal(unmanaged.writes.length, 0)
  const otherPR = github(); otherPR.prs.push({ state: 'open', body: 'unrelated human PR' })
  await assert.rejects(publish(otherPR), /another PR/); assert.equal(otherPR.writes.length, 0)
  const stale = github(); stale.files['KMNZ2.0/src/data/music/songs.json'] += '\n'
  await assert.rejects(publish(stale), /Checkout differs/); assert.equal(stale.writes.length, 0)
  const concurrent = github(); await publish(concurrent)
  const originalHead = concurrent.refs.get(reviewBranch), originalApi = concurrent.api
  concurrent.api = async (method, path, body, optional) => {
    if (method === 'PATCH') throw new Error('GitHub API HTTP 422')
    return originalApi(method, path, body, optional)
  }
  await assert.rejects(publish(concurrent, { collect: collect([candidate('NewVideo002')]) }), /422/)
  assert.equal(concurrent.refs.get(reviewBranch), originalHead)
  assert.equal(concurrent.refs.get(baseBranch), concurrent.base)
})

test('orphaned managed branch is recovered after PR creation failure without duplicating commits', async () => {
  const git = github(), original = git.api
  git.api = async (method, path, body, optional) => {
    if (method === 'POST' && path === '/pulls') throw new Error('GitHub API HTTP 403')
    return original(method, path, body, optional)
  }
  await assert.rejects(publish(git), /403/)
  const head = git.refs.get(reviewBranch)
  git.api = original
  assert.equal((await publish(git)).status, 'created-review')
  assert.equal(git.refs.get(reviewBranch), head)
  assert.equal(git.prs.length, 1)
})

test('merged and squash-merged reviews can start a new round with a fast-forward-only update', async () => {
  const git = github(); await publish(git)
  git.prs[0].state = 'closed'; git.prs[0].merged_at = '2026-10-30T00:00:00Z'
  // A squash merge need not have the former review head in its ancestry.
  const mergedFiles = { ...git.headFiles() }, tree = keySha(300), commit = keySha(301)
  git.trees.set(tree, mergedFiles)
  git.commits.set(commit, { sha: commit, tree: { sha: tree }, parents: [git.base], message: 'squashed reviewed candidates' })
  git.refs.set(baseBranch, commit)
  const root = await mkdtemp(join(tmpdir(), 'kmnz-review-test-'))
  try {
    for (const [path, content] of context.originals) {
      await mkdir(dirname(resolve(root, path)), { recursive: true })
      await writeFile(resolve(root, path), path === 'music-discovery/candidates.json' ? mergedFiles[reviewPath] : content)
    }
    const updated = await loadContext(root)
    const result = await publish(git, { context: updated, collect: collect([candidate(), candidate('NewVideo002')]) })
    assert.equal(result.status, 'created-review'); assert.equal(git.prs.length, 2)
    assert(git.commits.get(git.refs.get(reviewBranch)).parents.includes(commit))
    assert.equal(git.refs.get(baseBranch), commit)
  } finally {
    assert.equal(dirname(root), resolve(tmpdir())); assert(root.startsWith(join(tmpdir(), 'kmnz-review-test-')))
    await rm(root, { recursive: true, force: true })
  }
})

test('GitHub transport rejects unexpected repositories, redacts errors, and does not retry ambiguous writes', async () => {
  assert.throws(() => githubClient({ repository: 'other/repo', token: 'secret' }))
  let count = 0
  const api = githubClient({ repository: 'THESuiseiCOMET/KMNZ', token: 'fixture-secret', fetcher: async (url, options) => {
    count++; assert.equal(options.headers.Authorization, 'Bearer fixture-secret')
    throw new Error('network leaked fixture-secret')
  } })
  await assert.rejects(api('POST', '/pulls', {}), error => !error.message.includes('fixture-secret'))
  assert.equal(count, 1)
  const denied = githubClient({ repository: 'THESuiseiCOMET/KMNZ', token: 'fixture-secret', fetcher: async () => new Response('fixture-secret', { status: 403 }) })
  await assert.rejects(denied('GET', '/pulls'), { message: 'GitHub API HTTP 403' })
})

test('manual workflow contains no schedule, deployment, auto-merge, credential persistence or untrusted shell interpolation', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/discover-music.yml', import.meta.url), 'utf8')
  assert(workflow.includes('workflow_dispatch:')); assert(!workflow.includes('schedule:'))
  for (const text of ['node-version: \'22\'', 'persist-credentials: false', 'pull-requests: write', 'node scripts/publish-music-review.mjs --publish', 'VITE_BASE_PATH: /KMNZ/']) assert(workflow.includes(text))
  for (const text of ['pull_request_target', 'deploy-pages', '--merge', 'force: true', '${{ inputs.', '${{ github.event.']) assert(!workflow.includes(text))
})
