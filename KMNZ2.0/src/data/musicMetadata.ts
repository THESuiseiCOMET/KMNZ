import automatic from './music-metadata.json'
import manual from './music-metadata.overrides.json'
import { resolveMetadata, sortMusicEntries, musicDate } from '../lib/musicMetadata'
import type { MusicMetadata, MusicMetadataIndex } from '../lib/musicMetadata'
import type { MusicEntry } from './music'

export const musicMetadata = automatic as MusicMetadataIndex
export const manualMusicMetadata = manual as MusicMetadataIndex
const metadataCache = new WeakMap<MusicEntry, MusicMetadata>()
const dateCache = new WeakMap<MusicEntry, ReturnType<typeof musicDate>>()

export function getMusicMetadata(entry: MusicEntry): MusicMetadata {
  let value = metadataCache.get(entry)
  if (!value) {
    value = resolveMetadata(entry, musicMetadata, manualMusicMetadata)
    metadataCache.set(entry, value)
  }
  return value
}

export function getMusicDate(entry: MusicEntry): ReturnType<typeof musicDate> {
  if (dateCache.has(entry)) return dateCache.get(entry) ?? null
  const value = musicDate(entry, getMusicMetadata(entry))
  dateCache.set(entry, value)
  return value
}
export const sortMusicByDate = (entries: MusicEntry[]) => sortMusicEntries(entries, musicMetadata, manualMusicMetadata)
