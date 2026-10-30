import { readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { discover, validateAllowlist, validateCandidates, model, metadata, serialize } from './discovery/core.mjs'
import { validateIndex, windowsFetch } from './update-music-metadata.mjs'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const candidatePath = 'music-discovery/candidates.json'
export const configPath = 'music-discovery/official-sources.json'
export const protectedPaths = ['src/data/music/songs.json', 'src/data/music/releases.json', 'src/data/music/sources.json', 'src/data/music-metadata.json', 'src/data/music-metadata.overrides.json']

export async function loadContext(root = projectRoot) {
  const originals = new Map()
  const read = async path => {
    const value = await readFile(resolve(root, path), 'utf8')
    originals.set(path, value)
    return JSON.parse(value)
  }
  const [songs, releases, sources, automatic, manual, config, previous] = await Promise.all([...protectedPaths, configPath, candidatePath].map(read))
  const library = model.parseMusicLibrary({ schemaVersion: 1, songs, releases, sources })
  const catalog = model.toMusicCatalog(library)
  validateIndex(automatic, catalog, metadata)
  validateIndex(manual, catalog, metadata, true)
  validateAllowlist(config); validateCandidates(previous, config)
  return { root, originals, library, config, previous }
}

export async function assertUnchanged(context) {
  for (const [path, original] of context.originals) {
    if (await readFile(resolve(context.root, path), 'utf8') !== original) throw new Error('Local input changed during discovery; no candidate file written')
  }
}

export async function saveCandidates(context, document) {
  validateCandidates(document, context.config)
  await assertUnchanged(context)
  if (serialize(document) === serialize(context.previous)) return false
  const path = resolve(context.root, candidatePath), temp = path + '.' + randomUUID() + '.tmp'
  try { await writeFile(temp, serialize(document), { flag: 'wx' }); await rename(temp, path) }
  finally { await unlink(temp).catch(() => {}) }
  return true
}

export async function runLocal({ root = projectRoot, write = false, apiKey = process.env.YOUTUBE_API_KEY, fetcher = process.platform === 'win32' ? windowsFetch : fetch, now, sleep, probe } = {}) {
  const context = await loadContext(root)
  const result = await discover({ ...context, apiKey, fetcher, now, sleep, probe })
  if (write && result.report.status === 'ok') result.report.written = await saveCandidates(context, result.document)
  return result
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log('node scripts/discover-music.mjs [--check | --write]\nDefault: preview candidate JSON and run report; never modifies the live music library.\n--check: offline validation. --write: atomically save review candidates only.\nOptional secret: YOUTUBE_API_KEY. Spotify discovery is not implemented in D1.')
    return
  }
  if (args.some(arg => !['--check', '--write'].includes(arg)) || new Set(args).size !== args.length || args.length > 1) throw new Error('Invalid options')
  if (args.includes('--check')) {
    const context = await loadContext()
    console.log(`Valid library: ${context.library.songs.length} songs, ${context.library.releases.length} releases, ${context.library.sources.length} sources; ${context.previous.candidates.length} review candidates.`)
    return
  }
  const result = await runLocal({ write: args.includes('--write') })
  console.log(serialize(args.includes('--write') ? result.report : result))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Music discovery failed. Existing library, manual metadata and candidate files retained; check credentials, API availability and input validation.'); process.exitCode = 1 })
}
