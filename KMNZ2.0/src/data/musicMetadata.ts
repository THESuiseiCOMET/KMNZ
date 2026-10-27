import automatic from './music-metadata.json'
import manual from './music-metadata.overrides.json'
import { resolveMetadata, sortMusicEntries } from '../lib/musicMetadata'
import type { MusicMetadataIndex } from '../lib/musicMetadata'
import type { MusicEntry } from './music'

export const musicMetadata = automatic as MusicMetadataIndex
export const manualMusicMetadata = manual as MusicMetadataIndex
export const getMusicMetadata = (entry: MusicEntry) => resolveMetadata(entry, musicMetadata, manualMusicMetadata)
export const sortMusicByDate = (entries: MusicEntry[]) => sortMusicEntries(entries, musicMetadata, manualMusicMetadata)
