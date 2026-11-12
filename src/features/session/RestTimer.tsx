import { useEffect, useRef } from 'react'
import { beep } from '../../hooks/audio'
import { formatClock, useNow } from '../../hooks/useNow'

interface Props {
  endsAt: number
  onClose: () => void
}

/** Full-screen pause countdown. Remaining time comes from the end timestamp. */
export function RestTimer({ endsAt, onClose }: Props) {
  const now = useNow()
  const remaining = (endsAt - now) / 1000
  const over = remaining <= 0
  const beeped = useRef(false)

  useEffect(() => {
    if (over && !beeped.current) {
      beeped.current = true
      beep(3)
    }
  }, [over])

  return (
    <div className={`rest ${over ? 'rest-over' : ''}`} role="timer" aria-live="polite">
      <p className="muted">{over ? 'Pause vorbei' : 'Pause'}</p>
      <p className="rest-clock">{over ? 'Weiter!' : formatClock(remaining)}</p>
      <button className="primary" onClick={onClose}>
        {over ? 'Nächster Satz' : 'Pause überspringen'}
      </button>
    </div>
  )
}
