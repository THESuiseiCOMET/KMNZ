export interface PlaybackPreferences { videoFrosted: boolean; coverFrosted: boolean }
export const playbackPreferencesKey = 'kmnzPlaybackPreferences'

export function parsePlaybackPreferences(raw: string | null): PlaybackPreferences {
  const fallback = { videoFrosted: true, coverFrosted: true }
  try {
    const value = JSON.parse(raw ?? 'null')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
    // Read older saved background settings, but never restore a removed player mode.
    return {
      videoFrosted: typeof value.videoFrosted === 'boolean' ? value.videoFrosted : typeof value.cinemaVideoFrosted === 'boolean' ? value.cinemaVideoFrosted : true,
      coverFrosted: typeof value.coverFrosted === 'boolean' ? value.coverFrosted : typeof value.floatingBackgroundFrosted === 'boolean' ? value.floatingBackgroundFrosted : typeof value.frosted?.floating === 'boolean' ? value.frosted.floating : true,
    }
  } catch { return fallback }
}
export function readPlaybackPreferences(): PlaybackPreferences {
  try { return parsePlaybackPreferences(localStorage.getItem(playbackPreferencesKey)) }
  catch { return parsePlaybackPreferences(null) }
}
