import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { loadTypeScript } from './load-typescript.mjs'

const { musicLibrary: currentLibrary } = await loadTypeScript(new URL('../src/data/musicLibrary.ts',import.meta.url))
const { createMusicViews } = await loadTypeScript(new URL('../src/lib/musicViews.ts',import.meta.url))
const { toMusicCatalog } = await loadTypeScript(new URL('../src/lib/musicLibrary.ts',import.meta.url))
const library = JSON.parse(await readFile(new URL('./fixtures/music-c1-library.json',import.meta.url),'utf8'))
const official = JSON.parse(await readFile(new URL('./fixtures/kmnculture-official.json',import.meta.url),'utf8'))
const copy = () => structuredClone(library)
const album = library.releases[0]
const wave = library.sources.find(source=>source.id==='yt-wave')
const mirror = library.sources.find(source=>source.id==='sp-mirror')
const albumSource = library.sources.find(source=>source.id==='sp-kmnculture')
const ids = entries => entries.map(entry=>entry.id)
function confirmed() {
  const value=copy()
  value.releases[0].tracklistStatus='partial'
  value.releases[0].tracks=[
    {songId:'song-growl',discNumber:1,trackNumber:2,sourceIds:[]},
    {songId:'song-new-days',discNumber:2,trackNumber:1,sourceIds:['yt-new-days']},
    {songId:'song-wave',discNumber:1,trackNumber:1,sourceIds:['yt-wave']},
  ]
  return value
}
function addSpotifyWave(value) {
  const source={...structuredClone(mirror),id:'sp-wave-c2-test',platformId:'AAAAAAAAAAAAAAAAAAAAAA',
    externalUrl:'https://open.spotify.com/track/AAAAAAAAAAAAAAAAAAAAAA',
    target:{type:'song',songId:wave.target.songId,releaseId:album.id}}
  value.sources.push(source)
  value.releases[0].tracks.find(track=>track.songId===wave.target.songId).sourceIds.push(source.id)
  return source
}

test('unknown-tracklist baseline separates one album and one single without inventing relationships',()=>{
  const views=createMusicViews(library)
  const sections=views.spotifySections('')
  assert.deepEqual(ids(sections.albums),['sp-kmnculture'])
  assert.deepEqual(ids(sections.singles),['sp-mirror'])
  assert.deepEqual(views.releaseDetail(albumSource.id).tracks,[])
  assert.equal(views.releaseDetail(albumSource.id).release.tracklistStatus,'unknown')
  for(const id of [mirror.id,wave.id,'missing']) assert.equal(views.releaseDetail(id),null)
})

test('Spotify EP/single releases use the singles section while albums/compilations retain the album section',()=>{
  for(const kind of ['ep','single','album','compilation','unknown']) {
    const value=copy(); value.releases[0].kind=kind
    const sections=createMusicViews(value).spotifySections('')
    assert.equal(sections.albums.length,['ep','single'].includes(kind)?0:1)
    assert.equal(sections.singles.length,['ep','single'].includes(kind)?2:1)
  }
})

test('multiple platform sources of the same release produce one card, distinct same-name editions stay separate',()=>{
  const value=copy()
  value.sources.push({...structuredClone(albumSource),id:'sp-kmnculture-alternate',platformId:'BBBBBBBBBBBBBBBBBBBBBB',
    externalUrl:'https://open.spotify.com/album/BBBBBBBBBBBBBBBBBBBBBB'})
  assert.equal(createMusicViews(value).spotifySections('').albums.length,1)
  value.releases.push({...structuredClone(album),id:'release-kmnculture-reissue'})
  value.sources.at(-1).target.releaseId='release-kmnculture-reissue'
  assert.equal(createMusicViews(value).spotifySections('').albums.length,2)
})

test('confirmed album tracks stay inside the album; track-title search finds that album without duplicating tracks',()=>{
  const value=confirmed()
  const source=addSpotifyWave(value)
  const views=createMusicViews(value)
  assert.deepEqual(ids(views.spotifySections('').singles),[mirror.id])
  assert.deepEqual(ids(views.spotifySections('  wAvE ').albums),[albumSource.id])
  assert.deepEqual(views.spotifySections('wave').singles,[])
  assert(!ids(views.spotifySections('').albums).includes(source.id))
})

test('track sources remain accessible when no Spotify release card exists',()=>{
  const value=confirmed()
  const source=addSpotifyWave(value)
  value.sources=value.sources.filter(item=>item.id!==albumSource.id)
  assert.deepEqual(ids(createMusicViews(value).spotifySections('wave').singles),[source.id])
})

test('Spotify cards group the confirmed DROPS tracks into one release without rewriting catalog visibility',()=>{
  const before=JSON.stringify(currentLibrary)
  const views=createMusicViews(currentLibrary)
  const all=views.spotifyCards('')
  assert.equal(all.filter(entry=>entry.id==='sp-drops').length,1)
  for(const id of ['sp-mirror','sp-drops-drop-in','sp-drops-growl'])assert(!all.some(entry=>entry.id===id))
  for(const query of ['MIRROR','DROP IN','GROWL','DROPS'])assert.deepEqual(ids(views.spotifyCards(query,'ep')).filter(id=>id==='sp-drops'),['sp-drops'])
  assert.equal(currentLibrary.sources.find(source=>source.id==='sp-drops').listed,false)
  assert.equal(JSON.stringify(currentLibrary),before)
})

test('Spotify categories retain album and former single/EP membership, deduplicate cards and respect search',()=>{
  const views=createMusicViews(currentLibrary)
  const all=views.spotifyCards('');const albums=views.spotifyCards('','albums');const ep=views.spotifyCards('','ep')
  assert.equal(albums.length,6);assert.equal(ep.length,30);assert.equal(all.length,36)
  assert.equal(new Set(ids(all)).size,all.length)
  assert.deepEqual(ids(all),[...ids(albums),...ids(ep)])
  assert(albums.some(entry=>entry.id==='sp-kmnculture'))
  assert(!ep.some(entry=>entry.id==='sp-kmnculture'))
  assert(ep.some(entry=>entry.id==='sp-drops'))
  assert(ep.some(entry=>entry.title==='HARMONICS'))
  assert.deepEqual(views.spotifyCards('MIRROR','albums'),[])
  assert.deepEqual(views.spotifyCards('no-match-spotify-card'),[])
})

test('incomplete or unverified hidden releases do not absorb their individual playable tracks',()=>{
  const value=structuredClone(currentLibrary)
  value.releases.find(release=>release.id==='release-drops').tracklistStatus='partial'
  const cards=createMusicViews(value).spotifyCards('MIRROR','ep')
  assert.deepEqual(ids(cards),['sp-mirror'])
  value.sources=value.sources.filter(source=>source.id!=='sp-drops')
  value.releases.find(release=>release.id==='release-drops').tracklistStatus='complete'
  assert.deepEqual(ids(createMusicViews(value).spotifyCards('MIRROR','ep')),['sp-mirror'])
})

test('search supports album/single metadata and confirmed song versions, never unrelated same-title songs',()=>{
  const views=createMusicViews(library)
  assert.deepEqual(ids(views.spotifySections('KMNCULTURE').albums),[albumSource.id])
  assert.deepEqual(ids(views.spotifySections('MIRROR').singles),[mirror.id])
  assert.deepEqual(views.spotifySections('WAVE'),{albums:[],singles:[]})
  const value=confirmed()
  value.songs.find(song=>song.id==='song-wave').version.label='Live at AREA'
  assert.deepEqual(ids(createMusicViews(value).spotifySections('live at area').albums),[albumSource.id])
  assert.deepEqual(createMusicViews(value).spotifySections('nonexistent'),{albums:[],singles:[]})
})

test('details sort by disc/track and use only explicitly confirmed sources, preferring Spotify',()=>{
  const value=confirmed()
  let detail=createMusicViews(value).releaseDetail(albumSource.id)
  assert.deepEqual(detail.tracks.map(track=>[track.discNumber,track.trackNumber,track.song.id]),[
    [1,1,'song-wave'],[1,2,'song-growl'],[2,1,'song-new-days'],
  ])
  assert.equal(detail.tracks[0].playback.id,'yt-wave')
  assert.equal(detail.tracks[1].playback,undefined)
  const spotify=addSpotifyWave(value)
  detail=createMusicViews(value).releaseDetail(albumSource.id)
  assert.equal(detail.tracks[0].playback.id,spotify.id)
  assert.equal(detail.tracks[1].playback,undefined)
})

test('grouping/search/detail selection do not mutate C1 library, metadata or compatibility catalog',()=>{
  const value=confirmed()
  const catalog=toMusicCatalog(value)
  const before=JSON.stringify({value,catalog})
  const views=createMusicViews(value,catalog)
  views.spotifySections('wave')
  views.spotifySections('')
  views.releaseDetail(albumSource.id)
  assert.equal(JSON.stringify({value,catalog}),before)
})

test('verified KMNCULTURE matches all nine official names, positions, artists and track identities',()=>{
  const views=createMusicViews(currentLibrary)
  const detail=views.releaseDetail(albumSource.id)
  assert.equal(detail.release.tracklistStatus,'complete')
  assert.equal(detail.tracks.length,official.tracks.length)
  assert.equal(detail.tracks.length,9)
  for(const [i,track] of detail.tracks.entries()) {
    const expected=official.tracks[i]
    assert.equal(track.discNumber,expected.discNumber)
    assert.equal(track.trackNumber,expected.trackNumber)
    assert.equal(track.song.title,expected.title)
    assert.equal(track.song.artist,expected.artist)
    assert.equal(track.playback.platform,'spotify')
    assert.equal(track.playback.platformId,expected.platformId)
    assert.equal(track.playback.externalUrl,expected.url)
    const source=currentLibrary.sources.find(source=>source.id===track.playback.id)
    assert.equal(source.target.songId,track.song.id)
    assert.equal(source.target.releaseId,detail.release.id)
  }
  assert.equal(ids(views.spotifySections('').albums).filter(id=>id===albumSource.id).length,1)
  assert.equal(ids(views.spotifySections('').singles).filter(id=>id===mirror.id).length,1)
  for(const expected of official.tracks) {
    assert.equal(ids(views.spotifySections(expected.title).albums).filter(id=>id===albumSource.id).length,1)
    assert(!views.spotifySections(expected.title).singles.some(entry=>entry.id.startsWith('sp-kmnculture-')))
  }
})

test('verified album dates and covers remain source-bound; same-name YouTube recordings are not merged by guesswork',async()=>{
  const helpers=await loadTypeScript(new URL('../src/lib/musicMetadata.ts',import.meta.url))
  const automatic=JSON.parse(await readFile(new URL('../src/data/music-metadata.json',import.meta.url),'utf8'))
  const manual=JSON.parse(await readFile(new URL('../src/data/music-metadata.overrides.json',import.meta.url),'utf8'))
  const detail=createMusicViews(currentLibrary).releaseDetail(albumSource.id)
  for(const track of detail.tracks) {
    const metadata=helpers.resolveMetadata(track.playback,automatic,manual)
    assert.equal(metadata.releaseDate.value,official.releaseDate)
    assert.equal(metadata.releaseDate.precision,'day')
    assert.equal(metadata.releaseDate.sourceUrl,track.playback.externalUrl)
    assert.equal(metadata.cover.url,automatic[albumSource.id].cover.url)
    assert.equal(metadata.cover.sourceUrl,official.sourceUrl)
    const sameNameVideo=currentLibrary.sources.find(source=>source.platform==='youtube'
      && currentLibrary.songs.find(song=>song.id===source.target.songId)?.title===track.song.title)
    if(sameNameVideo) assert.notEqual(track.song.id,sameNameVideo.target.songId)
  }
})

test('single rows resolve only confirmed C1 release relationships and keep MIRROR visible once',()=>{
  const views=createMusicViews(currentLibrary)
  assert.equal(views.sourceRelease('sp-mirror').title,'DROPS')
  assert.equal(createMusicViews(library).sourceRelease('sp-mirror'),undefined)
  assert.equal(views.sourceRelease('missing'),undefined)
  assert.equal(views.sourceRelease('sp-kmnculture').id,'release-kmnculture')
  const release=views.sourceRelease('sp-mirror')
  assert.equal(release.tracklistStatus,'complete')
  assert.deepEqual(release.tracks.map(track=>[track.trackNumber,currentLibrary.songs.find(song=>song.id===track.songId).title]),[[1,'DROP IN'],[2,'GROWL'],[3,'MIRROR']])
  assert(release.tracks[2].sourceIds.includes('sp-mirror'))
  assert.equal(ids(views.spotifySections('').albums).filter(id=>id==='sp-kmnculture').length,1)
  assert.equal(ids(views.spotifySections('').singles).filter(id=>id==='sp-mirror').length,1)
})

test('release-name links find exact official album sources without changing the main Spotify list',()=>{
  const views=createMusicViews(currentLibrary)
  assert.equal(views.releaseEntryForSource('sp-mirror').id,'sp-drops')
  assert.equal(views.releaseEntryForSource('sp-kmnculture-verse').id,'sp-kmnculture')
  assert.equal(views.releaseEntryForSource('yt-wave'),undefined)
  assert.equal(views.releaseEntryForSource('missing'),undefined)
  assert.equal(createMusicViews(library).releaseEntryForSource('sp-mirror'),undefined)
  const detail=views.releaseDetail('sp-drops')
  assert.equal(detail.release.title,'DROPS')
  assert.equal(detail.entry.kind,'album')
  assert.equal(detail.entry.platformId,'5uqDam637cLI8dRHhFyyqT')
  assert.deepEqual(detail.tracks.map(track=>[track.trackNumber,track.song.title]),[[1,'DROP IN'],[2,'GROWL'],[3,'MIRROR']])
  assert.equal(ids(views.spotifySections('').albums).filter(id=>id==='sp-kmnculture').length,1)
  assert.equal(ids(views.spotifySections('').singles).filter(id=>id==='sp-mirror').length,1)
  const visible=structuredClone(currentLibrary)
  visible.sources.find(source=>source.id==='sp-drops').listed=true
  assert.deepEqual(ids(createMusicViews(visible).spotifySections('').singles).filter(id=>id==='sp-drops'||id==='sp-mirror'||id.startsWith('sp-drops-')),['sp-drops'])
})

test('listed source visibility is optional and accepts only booleans',async()=>{
  const {parseMusicLibrary}=await loadTypeScript(new URL('../src/lib/musicLibrary.ts',import.meta.url))
  const value=structuredClone(currentLibrary)
  value.sources[0].listed='false'
  assert.throws(()=>parseMusicLibrary(value),/listed/)
  value.sources[0].listed=false
  assert.doesNotThrow(()=>parseMusicLibrary(value))
  delete value.sources[0].listed
  assert.doesNotThrow(()=>parseMusicLibrary(value))
})

test('real detail rendering and original YouTube cards',async t=>{
  const server=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),
    base:'/KMNZ/',server:{middlewareMode:true},appType:'custom'})
  try {
    const {default:Detail}=await server.ssrLoadModule('/src/components/MusicReleaseDetail.tsx')
    const {default:Music}=await server.ssrLoadModule('/src/pages/Music.tsx')
    const {default:SingleRow}=await server.ssrLoadModule('/src/components/MusicSingleRow.tsx')
    const {default:PlayerDock}=await server.ssrLoadModule('/src/components/PlayerDock.tsx')
    const {default:Backdrop}=await server.ssrLoadModule('/src/components/PlaybackBackdrop.tsx')
    const {default:Settings}=await server.ssrLoadModule('/src/components/PlaybackSettings.tsx')
    const {default:Header}=await server.ssrLoadModule('/src/components/Header.tsx')
    const {default:AudioVisualizer}=await server.ssrLoadModule('/src/components/AudioVisualizer.tsx')
    const {default:Home}=await server.ssrLoadModule('/src/pages/Home.tsx')
    await t.test('visualizer switch is independent of playback and replaces home content while retaining its background',()=>{
      const props={open:false,settings:{presentation:'cinema',frosted:{floating:true,cinema:true},cinemaVideoFrosted:true},onChange:()=>{},onClose:()=>{}}
      for(const presentation of ['floating','cinema']) {
        const initial=renderToStaticMarkup(createElement(Settings,{...props,settings:{...props.settings,presentation}}))
        const toggle=initial.match(/<span>音频可视化<\/span><input[^>]+>/)?.[0]
        assert(toggle);assert(!toggle.includes('disabled'));assert(!toggle.includes('checked'))
        assert(!initial.includes('显示位置'));assert(!initial.includes('首页区域'));assert(!initial.includes('<option value="fullscreen">'))
        assert(!initial.includes('播放音乐后可开启'))
      }
      const ready=renderToStaticMarkup(createElement(Settings,{...props,visualizationEnabled:true,visualizationError:'未取得音轨'}))
      assert(ready.match(/<span>音频可视化<\/span><input[^>]*checked=""/))
      assert(ready.includes('role="alert">未取得音轨'))
      const pending=renderToStaticMarkup(createElement(Settings,{...props,visualizationPending:true}))
      assert(pending.includes('等待音频共享'))
      const inputProps={...props,audioSource:{kind:'input',deviceId:''},audioInputs:[{deviceId:'stereo-mix',label:'立体声混音 (Realtek)'}]}
      const input=renderToStaticMarkup(createElement(Settings,inputProps))
      assert(input.includes('音频来源'));assert(input.includes('读取输入设备'));assert(input.includes('立体声混音 (Realtek)'))
      assert(input.includes('role="switch"'))
      const selected=renderToStaticMarkup(createElement(Settings,{...inputProps,audioSource:{kind:'input',deviceId:'stereo-mix'}}))
      assert(!selected.includes('勾选共享标签页音频'))
      const silentInput=renderToStaticMarkup(createElement(Settings,{...inputProps,visualizationEnabled:true,audioSignal:{status:'silent',decibels:-100}}))
      assert(silentInput.includes('音频输入电平'));assert(silentInput.includes('未收到有效音频'))
      assert(silentInput.includes('对应声卡的输出'));assert(silentInput.includes('value="-90"'))
      const suspendedInput=renderToStaticMarkup(createElement(Settings,{...inputProps,visualizationEnabled:true,audioSignal:{status:'suspended',decibels:-100}}))
      assert(suspendedInput.includes('恢复音频分析'))
      const receivingInput=renderToStaticMarkup(createElement(Settings,{...inputProps,visualizationEnabled:true,audioSignal:{status:'receiving',decibels:-42}}))
      assert(receivingInput.includes('正在接收音频'));assert(receivingInput.includes('value="-42"'))
      assert(!receivingInput.includes('对应声卡的输出'))
      for(const theme of ['light','dark']) {
        const html=renderToStaticMarkup(createElement(AudioVisualizer,{session:{analyser:{},sampleRate:48000},theme}))
        assert(decodeURIComponent(html).includes(theme==='dark'?'#ffffff':'#171717'))
        assert(html.includes('<canvas'));assert(!html.includes('<button'));assert(!html.includes('audio-visualizer-tools'))
        assert(!html.includes('<iframe'));assert(!html.includes('<audio'));assert(!html.includes('<video'))
      }
      const header=renderToStaticMarkup(createElement(Header,{page:'home',theme:'light',concealed:true,onNavigate:()=>{},onToggleTheme:()=>{}}))
      assert(header.includes('inert=""'));assert(header.includes('aria-hidden="true"'))
      const normal=renderToStaticMarkup(createElement(Home))
      const replacement=renderToStaticMarkup(createElement(Home,{visualizer:createElement('section',{'aria-label':'音频可视化'})}))
      assert(normal.includes('hero home-hero'));assert(normal.includes('KMNZ 海报轮播'));assert(!replacement.includes('KMNZ 海报轮播'))
      assert(normal.includes('欢迎来到'));assert(normal.includes('这里展示团体成员资料'));assert(normal.includes('hero-inner'))
      assert(replacement.includes('hero home-hero home-visualizer-hero'));assert(!replacement.includes('欢迎来到 KMNZ 资料站'))
      assert(!replacement.includes('这里展示团体成员资料'));assert(!replacement.includes('hero-inner'))
      assert(!replacement.includes('hero-carousel'));assert(!replacement.includes('等待音频信号'))
    })
    await t.test('navigation places browser fullscreen between theme and settings with a separate center control slot',()=>{
      const html=renderToStaticMarkup(createElement(Header,{page:'home',theme:'light',onNavigate:()=>{},onToggleTheme:()=>{},onOpenSettings:()=>{},onHideNavigation:()=>{}}))
      const nav=html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0]
      assert(nav)
      for(const label of ['首页','音乐','成员','历程','关于']) assert(nav.includes('>'+label+'</button>'))
      assert(nav.indexOf('class="fullscreen-toggle"')>nav.indexOf('class="theme-toggle"'))
      assert(nav.indexOf('class="settings-toggle"')>nav.indexOf('class="fullscreen-toggle"'))
      assert(nav.indexOf('class="navigation-toggle"')>nav.indexOf('class="settings-toggle"'))
      assert(nav.includes('隐藏顶部导航栏'))
      assert(nav.includes('进入网页全屏'));assert.equal((nav.match(/fullscreen-corner-/g)??[]).length,2)
      assert(html.indexOf('class="header-player-slot"')<html.indexOf('<nav'))
      assert(!nav.includes('header-player-slot'))
    })
    await t.test('presentation settings expose two modes and a per-mode frost switch without extra players',()=>{
      const html=renderToStaticMarkup(createElement(Settings,{open:false,settings:{presentation:'cinema',frosted:{floating:true,cinema:false},cinemaVideoFrosted:true},onChange:()=>{},onClose:()=>{}}))
      assert(html.includes('播放设置'));assert(html.includes('浮窗模式'));assert(html.includes('影院模式'))
      assert(html.match(/<input[^>]*value="cinema"[^>]*>/)?.[0].includes('checked=""'))
      assert(html.includes('role="switch"'))
      assert(!html.includes('<iframe'))
    })
    await t.test('cinema video glass is independent of cover frost and keeps one media host',()=>{
      const entry=toMusicCatalog(currentLibrary).find(entry=>entry.platform==='youtube')
      for(const videoFrosted of [true,false]) {
        const html=renderToStaticMarkup(createElement(PlayerDock,{entry,onClose:()=>{},onSkip:()=>{},presentation:'cinema',videoFrosted}))
        assert.equal(html.includes('is-video-frosted'),videoFrosted)
        assert.equal((html.match(/class="music-player-embed"/g)??[]).length,1)
        assert(html.includes('class="cinema-video-glass" aria-hidden="true"'))
      }
      for(const presentation of ['floating','cinema']) {
        const html=renderToStaticMarkup(createElement(Settings,{open:false,settings:{presentation,frosted:{floating:true,cinema:false},cinemaVideoFrosted:true},onChange:()=>{},onClose:()=>{}}))
        assert.equal(html.includes('视频磨砂'),presentation==='cinema')
        assert.equal((html.match(/role="switch"/g)??[]).length,presentation==='cinema'?3:2)
      }
    })
    await t.test('cinema and floating layouts retain one official host and the original controls for both platforms',()=>{
      const catalog=toMusicCatalog(currentLibrary)
      for(const platform of ['youtube','spotify']) {
        const entry=catalog.find(entry=>entry.platform===platform)
        const props={entry,onClose:()=>{},onSkip:()=>{}}
        const floating=renderToStaticMarkup(createElement(PlayerDock,props))
        const cinema=renderToStaticMarkup(createElement(PlayerDock,{...props,presentation:'cinema'}))
        assert(cinema.includes('music-player-panel is-cinema'))
        for(const html of [floating,cinema]) {
          assert.equal((html.match(/class="music-player-embed"/g)??[]).length,1)
          for(const label of ['上一首','下一首','播放歌曲','开启单曲循环']) assert(html.includes('aria-label="'+label+'"'))
          assert(html.includes('class="music-player-toggle"'))
        }
        assert(cinema.includes('aria-label="当前曲目"'))
        assert(floating.includes('aria-label="移动播放器"'))
      }
    })
    await t.test('cover backgrounds offer frosted and clear presentations without a second media source',()=>{
      const entry=toMusicCatalog(currentLibrary).find(entry=>entry.platform==='youtube')
      for(const [frosted,label] of [[true,'is-frosted'],[false,'is-clear']]) {
        const html=renderToStaticMarkup(createElement(Backdrop,{entry,frosted}))
        assert(html.includes(label));assert.equal((html.match(/<img\b/g)??[]).length,1)
        assert(!html.includes('<iframe'));assert(!html.includes('<video'))
      }
    })
    await t.test('playback backdrop uses official artwork for either platform without adding players or controls',()=>{
      const catalog=toMusicCatalog(currentLibrary)
      for(const platform of ['youtube','spotify']) {
        const entry=catalog.find(entry=>entry.platform===platform)
        const html=renderToStaticMarkup(createElement(Backdrop,{entry}))
        assert(html.includes('playback-backdrop-'+platform))
        assert(html.includes('aria-hidden="true"'))
        assert.equal((html.match(/<img\b/g)??[]).length,1)
        assert(!/<(?:iframe|video|audio|button|input)\b/.test(html))
        assert(!html.includes('youtube.com/embed'))
        if(platform==='youtube') assert(html.includes('i.ytimg.com/vi/'+entry.platformId+'/'))
        else assert(/spotifycdn\.com\/image\/|i\.scdn\.co\/image\//.test(html))
      }
    })
    await t.test('closing playback removes the backdrop and missing artwork falls back without a broken player',()=>{
      assert.equal(renderToStaticMarkup(createElement(Backdrop,{entry:null})),'')
      const entry=toMusicCatalog(currentLibrary).find(entry=>entry.platform==='spotify')
      const html=renderToStaticMarkup(createElement(Backdrop,{entry:{...entry,id:'missing-artwork'}}))
      assert(html.includes('music-cover-placeholder'))
      assert(!html.includes('<img'))
      assert(!html.includes('<iframe'))
    })
    const render=detail=>renderToStaticMarkup(createElement(Detail,{detail,selectedId:null,onSelect:()=>{},onBack:()=>{}}))
    await t.test('unknown tracklist keeps verified date, official cover/link and album playback without an extra player',()=>{
      const html=render(createMusicViews(library).releaseDetail(albumSource.id))
      assert(html.includes('曲目待确认'))
      assert(html.includes('2025.01.06'))
      assert(/datetime="2025-01-06"/i.test(html))
      assert(html.includes('image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c3862da277d06dce2fa6b224'))
      assert(html.includes(albumSource.externalUrl))
      assert(html.includes('aria-label="播放 KMNCULTURE"'))
      assert(!html.includes('<iframe'))
      assert(!html.includes('9 首作品'))
      assert(!html.includes('下一首'))
      assert.equal((html.match(/<button\b/g)??[]).length,2)
    })
    await t.test('confirmed rows render only working playback sources and retain actual track order',()=>{
      const html=render(createMusicViews(confirmed()).releaseDetail(albumSource.id))
      assert(html.includes('已确认曲目'))
      assert(html.includes('aria-label="播放 WAVE"'))
      assert(html.includes('aria-label="播放 NEW DAYS"'))
      assert(!html.includes('aria-label="播放 GROWL"'))
      assert(html.includes('在 YouTube 打开 WAVE'))
      assert(html.indexOf('>WAVE<')<html.indexOf('>GROWL<'))
      assert(html.indexOf('>GROWL<')<html.indexOf('>NEW DAYS<'))
      assert(!html.includes('<iframe'))
    })
    await t.test('verified real album renders nine playable rows with one album action and no extra player',()=>{
      const html=render(createMusicViews(currentLibrary).releaseDetail(albumSource.id))
      assert(!html.includes('曲目待确认'))
      assert.equal((html.match(/<li\b/g)??[]).length,9)
      assert.equal((html.match(/<button\b/g)??[]).length,11)
      for(const track of official.tracks) {
        assert(html.includes('aria-label="播放 '+track.title+'"'))
        assert(html.includes(track.url))
      }
      assert(!html.includes('<iframe'))
    })

    await t.test('single row renders official square cover, verified album/date, icon-only play and external link',()=>{
      const entry=toMusicCatalog(currentLibrary).find(entry=>entry.id==='sp-mirror')
      const release=createMusicViews(currentLibrary).sourceRelease(entry.id)
      const html=renderToStaticMarkup(createElement(SingleRow,{entry,release,selectedId:entry.id,onSelect:()=>{}}))
      assert(html.includes('class="music-single-row selected"'))
      assert(html.includes('music-single-cover'))
      assert(html.includes('DROPS'))
      assert(html.includes('2025.06.13'))
      assert(html.includes('image-cdn-ak.spotifycdn.com/image/ab67616d00001e02cac7cde695126b200c58052c'))
      assert(html.includes('class="music-play music-single-play"'))
      assert(html.includes('aria-label="播放 MIRROR"'))
      assert(!html.includes('>播放<'))
      assert(html.includes(entry.externalUrl))
      assert(!html.includes('<iframe'))
      const unknown=renderToStaticMarkup(createElement(SingleRow,{entry,selectedId:null,onSelect:()=>{}}))
      assert(!unknown.includes('DROPS'))
      assert(unknown.includes('2025.06.13'))
    })

    await t.test('verified album labels are separate navigation buttons; DROPS uses its own official album entry',()=>{
      const entry=toMusicCatalog(currentLibrary).find(entry=>entry.id==='sp-mirror')
      const views=createMusicViews(currentLibrary)
      const html=renderToStaticMarkup(createElement(SingleRow,{entry,release:views.sourceRelease(entry.id),selectedId:null,onSelect:()=>{},onOpenAlbum:()=>{}}))
      assert(html.includes('aria-label="查看 DROPS 详情"'))
      assert(html.includes('music-single-album-button'))
      assert(html.includes('aria-label="播放 MIRROR"'))
      const detail=render(views.releaseDetail('sp-drops'))
      assert(detail.includes('>DROPS<'))
      assert(detail.includes('aria-label="播放 DROPS"'))
      assert(detail.includes('https://open.spotify.com/album/5uqDam637cLI8dRHhFyyqT'))
      assert(detail.includes('2025.06.13'))
      assert(!detail.includes('曲目待确认'))
      assert.equal((detail.match(/<li\b/g)??[]).length,3)
      assert(!detail.includes('<iframe'))
    })

    await t.test('Spotify dock shows one full artwork area and one official host with existing controls; YouTube and missing artwork remain safe',()=>{
      const catalog=toMusicCatalog(currentLibrary)
      const spotify=catalog.find(entry=>entry.id==='sp-mirror')
      const renderDock=entry=>renderToStaticMarkup(createElement(PlayerDock,{entry,onClose:()=>{},onSkip:()=>{}}))
      const html=renderDock(spotify)
      assert(html.includes('music-player-spotify-cover'))
      assert(html.includes('aria-label="MIRROR 封面"'))
      assert(html.includes('image-cdn-ak.spotifycdn.com/image/ab67616d00001e02cac7cde695126b200c58052c'))
      assert.equal((html.match(/class="music-player-embed"/g)??[]).length,1)
      for(const label of ['移动播放器','关闭播放器并停止播放','开启单曲循环','上一首','播放歌曲','下一首']) assert(html.includes('aria-label="'+label+'"'))
      const youtube=renderDock(catalog[0])
      assert(!youtube.includes('music-player-spotify-cover'))
      assert(youtube.includes('music-player-frame youtube-frame'))
      assert(youtube.includes('aria-label="音量控制"'))
      assert(youtube.includes('class="music-player-progress"'))
      assert(youtube.indexOf('class="music-player-controls"') < youtube.indexOf('class="music-player-progress"'))
      assert(youtube.indexOf('class="music-player-progress"') < youtube.indexOf('class="music-player-frame youtube-frame"'))
      assert(youtube.includes('aria-label="播放进度"'))
      assert(youtube.includes('aria-valuetext="0:00 / --:--"'))
      assert(!html.includes('class="music-player-progress"'))
      const missing=renderDock({...spotify,id:'sp-cover-missing-test'})
      assert(missing.includes('music-player-spotify-cover'))
      assert(missing.includes('music-cover-placeholder'))
    })

    await t.test('expanded YouTube catalog keeps official sources with rounded artwork, glass playback and branded links',()=>{
      const html=renderToStaticMarkup(createElement(Music,{selectedId:null,onSelect:()=>{}}))
      const expected=currentLibrary.sources.filter(source=>source.platform==='youtube').length
      assert.equal((html.match(/<article\b/g)??[]).length,expected)
      assert.equal((html.match(/class="music-art music-art-youtube"/g)??[]).length,expected)
      assert.equal((html.match(/class="music-art-frame"/g)??[]).length,expected)
      assert.equal((html.match(/class="music-cover-play music-card-play-youtube"/g)??[]).length,expected)
      assert.equal((html.match(/class="music-external music-youtube-link"/g)??[]).length,expected)
      assert.equal((html.match(/class="music-card-body music-card-body-youtube"/g)??[]).length,expected)
      assert.equal((html.match(/class="music-art-frame"><button[^>]*>[\s\S]*?<\/button><button[^>]*class="music-cover-play music-card-play-youtube"/g)??[]).length,expected)
      for (const entry of toMusicCatalog(currentLibrary).filter(entry=>entry.platform==='youtube')) {
        assert(html.includes('href="'+entry.externalUrl+'"'))
        assert(html.includes('aria-label="在 YouTube 打开 '+entry.title.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#x27;')+'"'))
      }
      assert(!html.includes('class="music-play"'))
      assert(html.includes('placeholder="搜索"'))
      assert(!html.includes('music-spotify-sections'))
      assert(!html.includes('<iframe'))
    })
  } finally { await server.close() }
})
