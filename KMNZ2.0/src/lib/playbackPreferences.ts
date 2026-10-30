export type PlayerPresentation = 'floating' | 'cinema'
export interface PlaybackPreferences {
  presentation: PlayerPresentation
  cinemaVideoFrosted: boolean
  floatingBackgroundFrosted: boolean
}
export const playbackPreferencesKey = 'kmnzPlaybackPreferences'

export function parsePlaybackPreferences(raw: string | null): PlaybackPreferences {
  const fallback: PlaybackPreferences = { presentation: 'floating', cinemaVideoFrosted: true, floatingBackgroundFrosted: true }
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!value || typeof value !== 'object') return fallback
    const saved = value as { presentation?: unknown; cinemaVideoFrosted?: unknown; floatingBackgroundFrosted?: unknown; frosted?: { floating?: unknown } }
    return {
      presentation: saved.presentation === 'cinema' ? 'cinema' : 'floating',
      cinemaVideoFrosted: typeof saved.cinemaVideoFrosted === 'boolean' ? saved.cinemaVideoFrosted : true,
      floatingBackgroundFrosted: typeof saved.floatingBackgroundFrosted === 'boolean' ? saved.floatingBackgroundFrosted : typeof saved.frosted?.floating === 'boolean' ? saved.frosted.floating : true,
    }
  } catch { return fallback }
}

export function readPlaybackPreferences(): PlaybackPreferences {
  try { return parsePlaybackPreferences(localStorage.getItem(playbackPreferencesKey)) }
  catch { return parsePlaybackPreferences(null) }
}

export function resolvePlayerPresentation(platform: 'youtube' | 'spotify' | undefined, preferred: PlayerPresentation): PlayerPresentation {
  return platform === 'spotify' ? 'floating' : preferred
}
