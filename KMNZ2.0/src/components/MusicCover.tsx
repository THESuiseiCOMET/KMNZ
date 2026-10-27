import { useState } from 'react'
import type { MusicEntry } from '../data/music'
import type { MusicMetadata } from '../lib/musicMetadata'
import { coverCandidates, validCoverSize } from '../lib/musicMetadata'
import placeholderIcon from '../assets/icons/image-off.svg'

const failedImages = new Set<string>()

function CoverImage({ entry, candidates }: { entry: MusicEntry; candidates: string[] }) {
  const available = (start: number) => candidates.findIndex((url, index) => index >= start && !failedImages.has(url))
  const [index, setIndex] = useState(() => available(0))
  const source = candidates[index]
  if (!source) {
    const mask = `url("${placeholderIcon}")`
    return <span className="music-cover-placeholder" aria-hidden="true"><span style={{ maskImage: mask, WebkitMaskImage: mask }} /></span>
  }
  function fallback() {
    failedImages.add(source)
    setIndex(available(index + 1))
  }
  return (
    <img
      src={source}
      alt=""
      width={entry.platform === 'youtube' ? 1280 : 640}
      height={entry.platform === 'youtube' ? 720 : 640}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={fallback}
      onLoad={(event) => {
        const image = event.currentTarget
        if (!validCoverSize(image.naturalWidth, image.naturalHeight, entry.platform, source.includes('/maxresdefault.'))) fallback()
      }}
    />
  )
}

export default function MusicCover({ entry, metadata }: { entry: MusicEntry; metadata: MusicMetadata }) {
  const candidates = coverCandidates(entry, metadata)
  return <CoverImage key={entry.id + ':' + candidates.join('|')} entry={entry} candidates={candidates} />
}
