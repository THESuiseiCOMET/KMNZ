import { writeFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { discover, emptyCandidates, validateCandidates, serialize } from './discovery/core.mjs'
import { loadContext, assertUnchanged, candidatePath } from './discover-music.mjs'

export const reviewBranch = 'automation/music-discovery'
export const baseBranch = '分支'
export const reviewPath = 'KMNZ2.0/' + candidatePath
export const marker = '<!-- kmnz-discovery:d1 -->'
export const commitMessage = 'chore: update music discovery candidates [kmnz-discovery-d1]'
export const reviewBody = `${marker}
收集自白名单官方接口的待审核候选；此 PR 不自动修改网站音乐库。

- [ ] 逐项打开 sourceUrl，确认音乐作品范围、官方身份和录音版本。
- [ ] 核实日期、封面和已有歌曲／发行关联，不按标题自动合并。
- [ ] 不收录的候选将 review.status 改为 dismissed，可在 review.note 写原因。
- [ ] 要上线的条目须在本 PR 中人工更新既有 songs/releases/sources 与元数据文件，保留 listed:false 和人工覆盖优先级。
- [ ] 运行音乐数据校验、相关测试及 /KMNZ/ 生产构建后人工合并。

仅合并候选清单不会把候选显示在网站上。请勿把频道分类当作录音身份或跨平台关系证据。`

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
function ensure(condition, message) { if (!condition) throw new Error(message) }
export function githubClient({ repository, token, fetcher = fetch }) {
  ensure(repository?.toLowerCase() === 'thesuiseicomet/kmnz' && token, 'Expected KMNZ repository and GitHub token')
  return async (method, path, body, optional = false) => {
    let response
    try {
      response = await fetcher('https://api.github.com/repos/' + repository + path, {
        method, redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch { throw new Error('GitHub request failed; rerun to reconcile existing review branch') }
    if (optional && response.status === 404) { await response.body?.cancel(); return null }
    if (!response.ok) { await response.body?.cancel(); throw new Error('GitHub API HTTP ' + response.status) }
    try { return await response.json() } catch { throw new Error('Invalid GitHub response') }
  }
}

export async function publishReview({ context, api, repository = 'THESuiseiCOMET/KMNZ', collect = discover, apiKey, fetcher, now, sleep, probe }) {
  ensure(repository.toLowerCase() === 'thesuiseicomet/kmnz', 'Unexpected target repository')
  const owner = repository.split('/')[0]
  const refPath = branch => '/git/ref/heads/' + encodeURIComponent(branch)
  const base = await api('GET', refPath(baseBranch))
  ensure(sha(base?.object?.sha), 'Missing base branch')
  const remoteBase = await api('GET', '/git/commits/' + base.object.sha)
  ensure(sha(remoteBase?.tree?.sha), 'Invalid base commit')
  // Check out the current publishing branch before running, rather than mixing stale local data with a new base.
  const remoteFile = async (path, ref, optional = false) => api('GET', '/contents/' + path + '?ref=' + encodeURIComponent(ref), undefined, optional)
  const decode = file => {
    ensure(file?.encoding === 'base64' && typeof file.content === 'string' && file.content.length <= 4000000, 'Invalid remote file')
    return Buffer.from(file.content, 'base64').toString('utf8')
  }
  for (const [path, original] of context.originals) {
    if (decode(await remoteFile('KMNZ2.0/' + path, base.object.sha)) !== original) throw new Error('Checkout differs from current publishing branch; rerun from the current base')
  }
  const prs = await api('GET', '/pulls?state=all&head=' + encodeURIComponent(owner + ':' + reviewBranch) + '&base=' + encodeURIComponent(baseBranch) + '&sort=created&direction=desc&per_page=100')
  ensure(Array.isArray(prs), 'Invalid PR response')
  const open = prs.filter(pr => pr.state === 'open')
  ensure(open.length <= 1 && open.every(pr => pr.body?.includes(marker)), 'Review branch is used by another PR')
  const prior = prs[0]
  if (!open.length && prior && !prior.merged_at) {
    return { status: 'closed-review', message: 'Previous review was closed without merging; reopen it or resolve it manually. No new PR created.' }
  }
  const head = await api('GET', refPath(reviewBranch), undefined, true)
  ensure(!open.length || head, 'Open review PR is missing its branch')
  let headCommit, previous = context.previous
  if (head) {
    ensure(sha(head.object?.sha), 'Invalid review ref')
    headCommit = await api('GET', '/git/commits/' + head.object.sha)
    ensure(sha(headCommit?.tree?.sha) && (prior?.body?.includes(marker) || headCommit.message === commitMessage), 'Unmanaged review branch; nothing overwritten')
    if (open.length || !prior) {
      const pending = await remoteFile(reviewPath, head.object.sha, true)
      ensure(pending, 'Managed review branch is missing its ledger')
      previous = JSON.parse(decode(pending))
      validateCandidates(previous, context.config)
    }
  }
  const result = await collect({ ...context, previous, apiKey, fetcher, now, sleep, probe })
  validateCandidates(result.document, context.config)
  await assertUnchanged(context)
  if (result.report.status !== 'ok') return { ...result.report, pr: open[0]?.html_url ?? null }
  const content = serialize(result.document)
  const previousContent = serialize(previous)
  if (content === previousContent && open.length) return { ...result.report, status: 'unchanged', pr: open[0].html_url }
  if (content === serialize(context.previous) && !open.length && (prior || !head)) return { ...result.report, status: 'unchanged', pr: null }
  if (content !== previousContent || !head || prior?.merged_at && !open.length) {
    const parent = open.length || head && !prior ? headCommit : remoteBase
    const tree = await api('POST', '/git/trees', { base_tree: parent.tree.sha, tree: [{ path: reviewPath, mode: '100644', type: 'blob', content }] })
    ensure(sha(tree?.sha), 'Invalid created tree')
    const parents = head ? [...new Set([head.object.sha, ...(parent === remoteBase ? [base.object.sha] : [])])] : [base.object.sha]
    const commit = await api('POST', '/git/commits', { message: commitMessage, tree: tree.sha, parents })
    ensure(sha(commit?.sha), 'Invalid created commit')
    if (head) await api('PATCH', '/git/refs/heads/' + encodeURIComponent(reviewBranch), { sha: commit.sha, force: false })
    else await api('POST', '/git/refs', { ref: 'refs/heads/' + reviewBranch, sha: commit.sha })
  }
  if (open.length) return { ...result.report, status: 'updated-review', pr: open[0].html_url }
  const pr = await api('POST', '/pulls', { title: 'chore: review newly discovered KMNZ music', head: reviewBranch, base: baseBranch, body: reviewBody, draft: true })
  ensure(typeof pr?.html_url === 'string' && /^https:\/\/github\.com\/THESuiseiCOMET\/KMNZ\/pull\/\d+$/i.test(pr.html_url), 'Invalid created PR response')
  return { ...result.report, status: 'created-review', pr: pr.html_url }
}

async function main() {
  ensure(process.argv.slice(2).join(' ') === '--publish', 'Use --publish explicitly; see docs/music-discovery.md')
  ensure(process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REF === 'refs/heads/' + baseBranch, 'Publisher only runs from the publishing branch in GitHub Actions')
  const context = await loadContext()
  const repository = process.env.GITHUB_REPOSITORY
  const api = githubClient({ repository, token: process.env.GITHUB_TOKEN })
  const report = await publishReview({ context, api, repository, apiKey: process.env.YOUTUBE_API_KEY })
  if (process.env.DISCOVERY_REPORT_FILE) await writeFile(process.env.DISCOVERY_REPORT_FILE, serialize(report))
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## KMNZ discovery D1\n\nStatus: ${report.status}\n\nNew candidates: ${report.added ?? 0}\n\nReview: ${report.pr ?? 'none'}\n\nSpotify: not implemented. Live music JSON: unchanged.\n`)
  console.log('Music discovery review: ' + report.status)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(async error => {
    const report = { status: 'failed', message: 'Discovery or review publication failed. Existing live JSON retained. Inspect API credentials, validation, branch ownership and repository workflow permissions.' }
    if (process.env.DISCOVERY_REPORT_FILE) await writeFile(process.env.DISCOVERY_REPORT_FILE, serialize(report)).catch(() => {})
    console.error(report.message)
    // Only locally generated, sanitized API status is useful; never echo provider payloads or request URLs.
    if (/^GitHub API HTTP \d{3}$|^YouTube API HTTP \d{3}$/.test(error.message)) console.error(error.message)
    process.exitCode = 1
  })
}
