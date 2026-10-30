import { readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { loadTypeScript } from './load-typescript.mjs'
export { loadTypeScript } from './load-typescript.mjs'

export async function windowsFetch(url, options = {}) {
  const reply = await new Promise((accept, reject) => {
    const found = spawnSync('where.exe',['pwsh.exe'],{windowsHide:true,encoding:'utf8'})
    const shell = found.status === 0 ? found.stdout.trim().split(/\r?\n/)[0] : 'powershell.exe'
    const child = spawn(shell, ['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./fetch-music-metadata.ps1',import.meta.url))], {windowsHide:true,stdio:['pipe','pipe','pipe']})
    let output = ''
    const timer = setTimeout(() => { child.kill(); reject(new Error('Request timed out')) }, 18000)
    child.stdout.on('data', chunk => { output += chunk.toString('utf8'); if (output.length > 1500000) child.kill() })
    child.stderr.resume()
    child.on('error', error => { clearTimeout(timer); reject(error) })
    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) { reject(new Error('System request failed')); return }
      try { accept(JSON.parse(output)) } catch { reject(new Error('Invalid system response')) }
    })
    child.stdin.on('error', () => {})
    child.stdin.end(JSON.stringify({url:String(url),headers:options.headers ?? {}}))
  })
  if (reply.status < 200 || reply.status > 599) throw new Error('System request unavailable')
  return new Response(Buffer.from(reply.body,'base64'),{status:reply.status,headers:{'content-type':reply.contentType}})
}

export function imageSize(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)}
  }
  if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const kind = bytes.toString('ascii', 12, 16)
    if (kind === 'VP8X') return {width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3)}
    if (kind === 'VP8 ') return {width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff}
    if (kind === 'VP8L' && bytes[20] === 0x2f) return {
      width: 1 + (bytes[21] | (bytes[22] & 0x3f) << 8),
      height: 1 + ((bytes[22] >> 6) | bytes[23] << 2 | (bytes[24] & 0x0f) << 10),
    }
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let offset = 2
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xd9 || marker === 0xda) return null
    if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd8) continue
    if (offset + 2 > bytes.length) return null
    const length = bytes.readUInt16BE(offset)
    if (length < 2 || offset + length > bytes.length) return null
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 7) {
      return {width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3)}
    }
    offset += length
  }
  return null
}

export async function probeCover(url, entry, helpers, fetcher = fetch) {
  if (!helpers.validHttpsUrl(url)) return null
  const host = new URL(url).hostname
  if (entry.platform === 'youtube' ? host !== 'i.ytimg.com' : !helpers.spotifyImageHost(host)) return null
  let reader
  try {
    const response = await fetcher(url, {signal: AbortSignal.timeout(12000), headers: {Accept: 'image/*'}})
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) { await response.body?.cancel(); return null }
    reader = response.body?.getReader()
    if (!reader) return null
    let bytes = Buffer.alloc(0)
    while (bytes.length < 65536) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes = Buffer.concat([bytes, Buffer.from(chunk.value).subarray(0, 65536 - bytes.length)])
      const size = imageSize(bytes)
      if (size) return helpers.validCoverSize(size.width, size.height, entry.platform, url.includes('/maxresdefault.')) ? size : null
    }
  } catch { return null } finally { try { await reader?.cancel() } catch { /* closed */ } }
  return null
}

export function validateIndex(index, catalog, helpers, manual = false) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) throw new Error('Metadata must be an object')
  const entries = new Map(catalog.map(entry => [entry.id, entry]))
  const allowed = ['platformId', 'cover', 'publishedAt', 'releaseDate', 'attempts']
  for (const [id, record] of Object.entries(index)) {
    const entry = entries.get(id)
    if (!entry || !record || record.platformId !== entry.platformId) throw new Error('Metadata ID mismatch: ' + id)
    if (Object.keys(record).some(key => !allowed.includes(key))) throw new Error('Unknown metadata field: ' + id)
    const effective = helpers.resolveMetadata(entry, manual ? {} : index, manual ? index : {})
    for (const key of ['cover', 'publishedAt', 'releaseDate']) {
      if (!(key in record)) continue
      if (record[key] === null && manual) continue
      if (!effective[key]) throw new Error('Invalid ' + key + ': ' + id)
      if (manual && record[key].source !== 'manual') {
        const url = key === 'publishedAt' && record[key].source === 'youtube-data-api' ? new URL(record[key].sourceUrl) : null
        const importedDate = entry.platform === 'youtube' && url && !url.port
          && ['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname)
          && url.pathname === '/watch' && url.searchParams.get('v') === entry.platformId
          && !url.searchParams.has('key')
        if (!importedDate) throw new Error('Manual source or matching YouTube API date required: ' + id)
      }
      if (!manual && record[key].source === 'manual') throw new Error('Put manual values in overrides: ' + id)
    }
    for (const [source, attempt] of Object.entries(record.attempts ?? {})) {
      if (manual || !['youtube-data-api','spotify-oembed','spotify-web-api'].includes(source)
        || !helpers.validPublishedAt(attempt.checkedAt) || !['ok','partial','failed','no-credentials','unavailable'].includes(attempt.status)) {
        throw new Error('Invalid attempt: ' + id)
      }
    }
  }
}

export async function updateMetadata({catalog, metadata, manual, helpers, env = {}, fetcher = fetch, now = new Date(), refresh = false}) {
  validateIndex(metadata, catalog, helpers)
  validateIndex(manual, catalog, helpers, true)
  const result = structuredClone(metadata)
  const timestamp = now.toISOString()
  const age = value => now.getTime() - Date.parse(value)
  const fresh = field => field && age(field.verifiedAt) >= 0 && age(field.verifiedAt) < 30 * 86400000
  const overridden = (entry, key) => manual[entry.id] && Object.hasOwn(manual[entry.id], key)
  const needs = (entry, key) => !overridden(entry, key) && (refresh || !fresh(result[entry.id]?.[key]))
  const recentFailure = (record, source) => !refresh && ['failed','unavailable'].includes(record.attempts?.[source]?.status)
    && age(record.attempts[source].checkedAt) < 86400000
  const attempt = (record, source, status) => {
    if (status === 'no-credentials' && record.attempts?.[source]?.status === status) return
    record.attempts ??= {}
    record.attempts[source] = {checkedAt: timestamp, status}
  }
  const proof = (source, sourceUrl) => ({source, status: 'verified', verifiedAt: timestamp, sourceUrl})
  const json = async (url, headers = {}) => {
    const response = await fetcher(url, {headers: {Accept: 'application/json', ...headers}, signal: AbortSignal.timeout(12000)})
    if (!response.ok) { await response.body?.cancel(); throw new Error('API request failed') }
    return response.json()
  }
  for (const entry of catalog) result[entry.id] ??= {platformId: entry.platformId}

  const youtube = catalog.filter(entry => entry.platform === 'youtube' && (needs(entry,'cover') || needs(entry,'publishedAt')))
  const pending = youtube.filter(entry => !recentFailure(result[entry.id], 'youtube-data-api'))
  if (!env.YOUTUBE_API_KEY) {
    for (const entry of youtube) attempt(result[entry.id], 'youtube-data-api', 'no-credentials')
  } else if (pending.length) {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos')
      url.searchParams.set('part','snippet')
      url.searchParams.set('id',pending.map(entry => entry.platformId).join(','))
      url.searchParams.set('key',env.YOUTUBE_API_KEY)
      const data = await json(url)
      if (!Array.isArray(data.items)) throw new Error('Invalid YouTube response')
      for (const entry of pending) {
        const record = result[entry.id]
        const video = data.items.find(item => item.id === entry.platformId)
        if (!video?.snippet) { attempt(record, 'youtube-data-api', 'unavailable'); continue }
        const snippet = video.snippet
        if (needs(entry,'publishedAt') && helpers.validPublishedAt(snippet.publishedAt)) {
          record.publishedAt = {value: snippet.publishedAt, ...proof('youtube-data-api', entry.externalUrl)}
        }
        if (needs(entry,'cover')) {
          const urls = [snippet.thumbnails?.maxres?.url, snippet.thumbnails?.medium?.url]
          for (const coverUrl of [...new Set(urls.filter(Boolean))]) {
            if (!coverUrl.startsWith('https://i.ytimg.com/vi/' + entry.platformId + '/') || !/\/(maxresdefault|mqdefault)\.jpg$/.test(new URL(coverUrl).pathname)) continue
            const size = await probeCover(coverUrl, entry, helpers, fetcher)
            if (size) { record.cover = {url: coverUrl, ...size, ...proof('youtube-data-api', entry.externalUrl)}; break }
          }
        }
        attempt(record,'youtube-data-api',record.cover && record.publishedAt ? 'ok' : 'partial')
      }
    } catch { for (const entry of pending) attempt(result[entry.id], 'youtube-data-api', 'failed') }
  }

  for (const entry of catalog.filter(item => item.platform === 'spotify')) {
    const record = result[entry.id]
    let coverFetched = false
    if (needs(entry,'cover') && !recentFailure(record,'spotify-oembed')) {
      try {
        const url = new URL('https://open.spotify.com/oembed')
        url.searchParams.set('url',entry.externalUrl)
        const data = await json(url)
        if (data.provider_name !== 'Spotify' || data.type !== 'rich') throw new Error('Invalid oEmbed response')
        const size = await probeCover(data.thumbnail_url, entry, helpers, fetcher)
        if (!size) throw new Error('Invalid Spotify artwork')
        record.cover = {url: data.thumbnail_url, ...size, ...proof('spotify-oembed', entry.externalUrl)}
        coverFetched = true
        attempt(record, 'spotify-oembed', 'ok')
      } catch { attempt(record, 'spotify-oembed', 'failed') }
    }
    const needsApiCover = needs(entry,'cover') && !coverFetched
    if (!needs(entry,'releaseDate') && !needsApiCover) continue
    if (!env.SPOTIFY_ACCESS_TOKEN) { attempt(record,'spotify-web-api','no-credentials'); continue }
    if (recentFailure(record,'spotify-web-api')) continue
    try {
      const data = await json('https://api.spotify.com/v1/' + (entry.kind === 'album' ? 'albums/' : 'tracks/') + entry.platformId,
        {Authorization: 'Bearer ' + env.SPOTIFY_ACCESS_TOKEN})
      if (data.id !== entry.platformId) throw new Error('Spotify ID mismatch')
      const album = entry.kind === 'album' ? data : data.album
      if (!album) throw new Error('Missing release')
      if (needs(entry,'releaseDate') && helpers.validReleaseDate(album.release_date,album.release_date_precision)) {
        record.releaseDate = {value: album.release_date, precision: album.release_date_precision, ...proof('spotify-web-api',entry.externalUrl)}
      }
      if (needsApiCover) {
        const covers = [...(album.images ?? [])].sort((a,b) => (b.width ?? 0) - (a.width ?? 0))
        for (const cover of covers) {
          const size = await probeCover(cover.url,entry,helpers,fetcher)
          if (size) { record.cover = {url: cover.url,...size,...proof('spotify-web-api',entry.externalUrl)}; break }
        }
      }
      attempt(record,'spotify-web-api',record.releaseDate ? 'ok' : 'partial')
    } catch { attempt(record,'spotify-web-api','failed') }
  }
  validateIndex(result, catalog, helpers)
  return result
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log('node scripts/update-music-metadata.mjs [--write | --check] [--refresh]\nDefault: preview JSON. --write: save static index. --check: offline validation.\nOptional environment: YOUTUBE_API_KEY, SPOTIFY_ACCESS_TOKEN. Manual values: src/data/music-metadata.overrides.json.\nSuccessful fields cache for 30 days; failed requests retry after 24 hours. --refresh bypasses cache.')
    return
  }
  if (args.some(arg => !['--write','--check','--refresh'].includes(arg)) || args.includes('--write') && args.includes('--check')) throw new Error('Invalid options; use --help')
  const dataUrl = new URL('../src/data/music-metadata.json', import.meta.url)
  const original = await readFile(dataUrl,'utf8')
  const metadata = JSON.parse(original)
  const manual = JSON.parse(await readFile(new URL('../src/data/music-metadata.overrides.json',import.meta.url),'utf8'))
  const {musicCatalog: catalog} = await loadTypeScript(new URL('../src/data/music.ts',import.meta.url))
  const helpers = await loadTypeScript(new URL('../src/lib/musicMetadata.ts',import.meta.url))
  validateIndex(metadata,catalog,helpers)
  validateIndex(manual,catalog,helpers,true)
  if (args.includes('--check')) { console.log('Valid metadata and overrides for ' + catalog.length + ' catalog entries.'); return }
  const result = await updateMetadata({catalog,metadata,manual,helpers,env: process.env,refresh: args.includes('--refresh'),fetcher:process.platform === 'win32' ? windowsFetch : fetch})
  const output = JSON.stringify(result,null,2) + '\n'
  if (!args.includes('--write')) { console.log(output); return }
  if (JSON.stringify(metadata) === JSON.stringify(result)) { console.log('No metadata changes; cached or manual values retained.'); return }
  if (await readFile(dataUrl,'utf8') !== original) throw new Error('Metadata changed while fetching; nothing written')
  const temp = fileURLToPath(dataUrl) + '.' + randomUUID() + '.tmp'
  try { await writeFile(temp,output,{flag:'wx'}); await rename(temp,dataUrl) } finally { await unlink(temp).catch(() => {}) }
  for (const entry of catalog) console.log(entry.id + ': ' + Object.entries(result[entry.id].attempts ?? {}).map(([source,state]) => source + '=' + state.status).join(', '))
  console.log('Saved static metadata. Manual overrides and catalog were not modified.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Metadata update failed validation or file access. Existing data retained. Check IDs, field values and local file permissions.'); process.exitCode = 1 })
}
