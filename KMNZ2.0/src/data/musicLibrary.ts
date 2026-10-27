import songs from './music/songs.json'
import releases from './music/releases.json'
import sources from './music/sources.json'
import { parseMusicLibrary } from '../lib/musicLibrary'

export const musicLibrary = parseMusicLibrary({ schemaVersion: 1, songs, releases, sources })
