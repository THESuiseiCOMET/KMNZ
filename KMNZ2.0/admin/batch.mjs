const members = ['LITA', 'LIZ', 'TINA', 'NERO']

export function detectTitleMembers(title, contentType = 'stream') {
  const normalized = String(title ?? '').normalize('NFKC').toUpperCase()
  const found = members.filter(member => new RegExp('(?:^|[^A-Z0-9])KMNZ[\\s_・×&-]*' + member + '(?=$|[^A-Z0-9])').test(normalized)
    || new RegExp('[#【\\[（(]\\s*' + member + '(?=$|[^A-Z0-9])').test(normalized))
  if (contentType === 'stream' && found.includes('LIZ')) return []
  return found
}

export function artistFromMembers(selected) {
  const normalized = [...new Set(selected.map(member => String(member).toUpperCase()))]
  if ((normalized.length === 2 && ['LITA', 'LIZ'].every(member => normalized.includes(member)))
    || (normalized.length === 3 && ['LITA', 'TINA', 'NERO'].every(member => normalized.includes(member)))) return 'KMNZ'
  return normalized.map(member => 'KMNZ ' + member).join(', ')
}

export function applyBatchSettings(row, settings = {}) {
  const contentType = settings.contentType || row.contentType || 'stream'
  const inferred = settings.autoMembers === false ? [] : detectTitleMembers(row.title, contentType)
  const selected = [...(inferred.length ? inferred : settings.members ?? row.members ?? [])]
  return { ...row, contentType, era: settings.era || row.era || 'new', originalGroup: settings.originalGroup ?? row.originalGroup ?? '',
    members: selected, memberMode: inferred.length ? 'title' : 'batch', artist: artistFromMembers(selected) }
}

export function initialReview(video, settings = {}) {
  return applyBatchSettings({ videoId: video.videoId, selected: true, title: video.apiTitle, songId: '', members: [] }, settings)
}

export function parseLinkRows(youtubeInput, bilibiliInput = '') {
  const youtube = String(youtubeInput ?? '').replace(/\r/g, '').split('\n').map(line => line.trim())
  const bilibili = String(bilibiliInput ?? '').replace(/\r/g, '').split('\n').map(line => line.trim())
  while (youtube.at(-1) === '') youtube.pop()
  if (!String(bilibiliInput ?? '').trim()) return youtube.flatMap((url, index) => url ? [{ youtube: url, bilibili: null, line: index + 1 }] : [])
  while (bilibili.at(-1) === '') bilibili.pop()
  if (youtube.length !== bilibili.length) throw Error('两列链接行数不同，请按相同行号一一对应；未自动绑定。')
  const rows = []
  for (let index = 0; index < youtube.length; index++) {
    if (!youtube[index] && !bilibili[index]) continue
    if (!youtube[index] || !bilibili[index]) throw Error('第 ' + (index + 1) + ' 行缺少对应链接，请检查两列；未自动绑定。')
    rows.push({ youtube: youtube[index], bilibili: bilibili[index], line: index + 1 })
  }
  if (rows.length > 200) throw Error('每批最多 200 行，请分批处理。')
  return rows
}
