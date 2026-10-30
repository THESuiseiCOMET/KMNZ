# D1 音乐发现与人工审核

本轮实现手动发现，不定时运行、不自动合并、不直接改发布分支。候选不会被前端读取。

## 实际范围

- `music-discovery/official-sources.json` 白名单只包含 KMNZ 官方 YouTube 频道 `UCqSPZz3gDBxJP-xaME8w-yA`，沿用 C4 已核实记录（`scripts/fixtures/music-c4-official.json`）及官方频道 URL。改白名单需要人工审查。
- 调用 YouTube Data API `channels.list` → 官方 uploads 播放列表 → `playlistItems.list` → `videos.list`。核对视频实际所属频道、公开状态、允许嵌入、完整发布时间、时长及白名单分类。
- 当前只筛选平台分类 `10`（Music），不凭标题推断原创、翻唱、合作、Remix 或歌曲身份。分类可能不准，仍需人工核实；其他分类的音乐可能漏掉。
- 每频道默认读取两页、最多 100 个最近上传条目。`maxPagesPerChannel` 可调 1–5；报告 `truncated` 表明未扫完，不宣称完整历史扫描。已有来源不导致提前停止分页。
- 使用 C1 `platformSourceKey` 去重，包括隐藏的 `listed: false`。同名不同平台 ID 留作不同候选，不生成歌曲 ID、发行 ID、曲序或跨平台关联。
- Spotify **尚未实现自动发现**，不会把 oEmbed 当作目录或发行日期接口，也不声称扫描了 Spotify、Topic 频道、未列入白名单的合作方或成员频道。

## 配置与启用

1. 先人工审查并将 D1 文件合入仓库。`workflow_dispatch` 的工作流需存在于仓库默认分支，Actions 才能列出手动入口。本项目只允许在 `分支` 上运行；如果默认分支不同，需要先通过审核把工作流放到默认分支，不能取消发布分支检查来绕过。
2. 在 Google Cloud 项目启用 **YouTube Data API v3**，创建 API Key，限制为该 API。不要使用浏览器来源限制；GitHub 托管 runner 的出口 IP 也不固定。
3. GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，新增 `YOUTUBE_API_KEY`。不要写入 JSON、前端 `VITE_` 变量或工作流明文。
4. Settings → Actions → General → Workflow permissions，允许 **GitHub Actions to create and approve pull requests**。本工作流仅创建草稿 PR，不调用审批或合并接口；权限使用 `contents: write`、`pull-requests: write`，不使用 Pages 部署权限。
5. `GITHUB_TOKEN` 由 Actions 自动提供，不需要额外 PAT。若仓库或组织禁止机器人创建 PR，任务会报错并保留正式数据；不要为了运行任务扩大不必要的账号权限。

## 手动运行

Actions → **Discover KMNZ music (review only)** → **Run workflow** → 选择 `分支` → Run workflow。

工作流先运行数据校验、全部测试和 `/KMNZ/` 生产构建，然后获取官方候选。摘要及 `kmnz-discovery-report` artifact 显示本轮状态、数量、拒收项及扫描是否截断。缺 Key 显示 `no-credentials`，不会写候选或创建空 PR。403、429、5xx、超时及损坏响应不写正式音乐资料；临时网络故障、429、5xx 最多请求三次，403 不重复消耗配额。

审核固定使用 `automation/music-discovery` 分支，目标始终是 `分支`。发布器通过 GitHub 官方 Git Data / Pull Requests API 只写 `KMNZ2.0/music-discovery/candidates.json`。不调用本地 Git，不强推，不修改部署工作流。第一次发现创建草稿 PR，以后更新同一个开放 PR；相同结果不产生新提交或反复改 PR 文案。

开放审核 PR 的人工修改与备注保留，自动更新只追加新候选。分支更新要求快进；并发人工提交会导致任务停止，重新运行即可重新读取。遇到同名但非本工具管理的分支／PR，停止，不覆盖。PR 关闭但未合并时不另开重复 PR：请先重新打开原 PR 或人工处理该审核分支。创建分支成功但建 PR 失败时，重新运行会复用已生成的候选和分支。

已合并 PR 后可继续使用固定分支；发布器以最新发布树为基础创建下一轮候选提交，通过父提交关联保持快进，兼容普通合并和 squash。建议保留审核分支；如果它已被删除，下一次运行可从发布分支重新建立。

## 审核候选

`music-discovery/candidates.json` 中：

- `key`：平台 + 视频类型 + 平台 ID；不是站内歌曲 ID。
- `sourceUrl`、`officialSourceId`：官方播放链接及白名单来源。
- `discoveredAt`：首次发现时间；重复运行不刷新。
- `raw`：官方 API 的原始标题、描述、完整 `publishedAt`、频道、分类、视频时长及状态。缺失描述为 `null`，不编写介绍或推断发行信息。
- `evidence`：官方频道、uploads 播放列表及不含密钥的接口 URL。证据表明来自官方频道，不代表已经确认歌曲版本关系。
- `cover`：只对 API 返回的 maxres / mqdefault 官方 URL 校验 HTTP 和实际解码尺寸，高清失败回退 mqdefault；无法验证则为 `null`。不使用 hqdefault、不生成或重托管封面。
- `review`：默认 `pending`；不收录时人工改为 `dismissed`，原因写入 `note`。后续运行保留整个已有候选，不覆盖人工修正，也不会重新添加已 dismiss 的视频。

先打开官方链接核实作品范围及录音身份。候选没有自动写入既有歌曲／专辑关系，因此不会把不确定关系当成已确认。

**仅合并候选清单不会新增线上歌曲。** 要上线的条目，需在审核 PR 中人工补齐／更新现有 `songs.json`、`releases.json`、`sources.json` 和元数据文件，选择稳定内部 ID，核实版本、日期精度、关联与 `listed: false`。新视频 `publishedAt` 保留完整 ISO，页面仍按 Asia/Tokyo 展示；它不是歌曲发行日期。人工覆盖继续由现有 overrides 管理，自动发现从不写这五个正式 JSON。

人工编辑后运行下方校验与构建，再手动合并。合并到 `分支` 后，现有 Pages 工作流正常构建部署；它不会自动解释候选清单。由 `GITHUB_TOKEN` 创建 PR 的检查可能需要人工允许，不能把缺少自动检查当作数据通过；本发现工作流本身已先运行测试，但 PR 后续人工编辑需要再验证。

## 本地命令（Node.js 22）

在 `KMNZ2.0/` 内：

```powershell
node scripts/discover-music.mjs --check
node scripts/discover-music.mjs
node scripts/discover-music.mjs --write
node scripts/update-music-metadata.mjs --check
node --test scripts/*.test.mjs
$env:VITE_BASE_PATH = '/KMNZ/'
npm.cmd run build
```

默认只输出预览；`--write` 只原子保存候选清单，写前再次检查所有输入是否被他人修改。Windows 网络复用项目既有系统请求适配；无 Key 不阻塞离线校验和前端构建。发布器必须显式 `--publish` 且仅在指定 GitHub Actions 分支执行，本地预览不会创建真实 PR。

## 验证边界与 D2

D1 单元／集成测试使用固定的官方响应结构和故障替身，不把它们当作现场 API 核实。没有真实 Key、仓库权限和实际 Actions 运行时，不能宣称已完成线上发现或 PR 演练。

D2 先用真实 Secret 完成手动运行和重复运行验收，再考虑 Spotify 官方 API 适配、人工审核后的受控资料迁移、更多经核实白名单、增量扫描覆盖及定时调度。不提前增加 `schedule`。

官方接口说明：

- [YouTube channels.list](https://developers.google.com/youtube/v3/docs/channels/list)、[playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list)、[videos.list](https://developers.google.com/youtube/v3/docs/videos/list)、[视频资源及发布时间](https://developers.google.com/youtube/v3/docs/videos)。
- [GitHub Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)、[手动工作流](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)、[Pull Requests API](https://docs.github.com/en/rest/pulls/pulls)、[Git Data trees](https://docs.github.com/en/rest/git/trees)、[Git refs](https://docs.github.com/en/rest/git/refs)。
