export type PlayerPresentation = 'floating' | 'cinema'
export interface PlaybackPreferences {
  presentation: PlayerPresentation
  frosted: Record<PlayerPresentation, boolean>
  cinemaVideoFrosted: boolean
}
export const playbackPreferencesKey = 'kmnzPlaybackPreferences'

export function parsePlaybackPreferences(raw: string | null): PlaybackPreferences {
  const fallback: PlaybackPreferences = { presentation: 'floating', frosted: { floating: true, cinema: true }, cinemaVideoFrosted: true }
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!value || typeof value !== 'object') return fallback
    const saved = value as { presentation?: unknown; frosted?: { floating?: unknown; cinema?: unknown }; cinemaVideoFrosted?: unknown }
    return {
      presentation: saved.presentation === 'cinema' ? 'cinema' : 'floating',
      cinemaVideoFrosted: typeof saved.cinemaVideoFrosted === 'boolean' ? saved.cinemaVideoFrosted : true,
      frosted: {
        floating: typeof saved.frosted?.floating === 'boolean' ? saved.frosted.floating : true,
        cinema: typeof saved.frosted?.cinema === 'boolean' ? saved.frosted.cinema : true,
      },
    }
  } catch { return fallback }
}

export function readPlaybackPreferences(): PlaybackPreferences {
  try { return parsePlaybackPreferences(localStorage.getItem(playbackPreferencesKey)) }
  catch { return parsePlaybackPreferences(null) }
}
