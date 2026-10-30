import { useLayoutEffect, useRef } from 'react'
import { useNavigationIndicator } from '../hooks/useNavigationIndicator'

interface MusicFilterGroupProps<T extends string> {
  label: string
  options: readonly (readonly [T, string])[]
  active: T | null
  onChange: (value: T) => void
  secondary?: boolean
}

export default function MusicFilterGroup<T extends string>({ label, options, active, onChange, secondary = false }: MusicFilterGroupProps<T>) {
  const { linksRef, indicator } = useNavigationIndicator(active ?? '', true, '.music-category[aria-pressed="true"]', '.music-category')
  const previous = useRef(indicator)
  useLayoutEffect(() => { if (indicator) previous.current = indicator }, [indicator])
  const bounds = indicator ?? previous.current

  return (
    <div ref={linksRef} className={'music-categories' + (secondary ? ' music-subcategories' : '') + (bounds ? ' has-indicator' : '')} role="group" aria-label={label}>
      <span className={'music-switch-indicator music-category-indicator' + (indicator ? ' is-visible' : '')} aria-hidden="true"
        style={{ width: bounds?.width ?? 0, height: bounds?.height ?? 0, transform: `translate(${bounds?.left ?? 0}px, ${bounds?.top ?? 0}px) scale(${indicator ? 1 : .94})` }} />
      <div className="music-category-labels">
        {options.map(([value, text]) => (
          <button type="button" key={value} className="music-category" data-segment-value={value} aria-pressed={active === value} onClick={() => onChange(value)}>
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
