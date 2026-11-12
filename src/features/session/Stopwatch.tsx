import { useLiveQuery } from 'dexie-react-hooks'
import { deleteMeta, getMeta, setMeta } from '../../db/sessions'
import { unlockAudio } from '../../hooks/audio'
import { formatClock, useNow } from '../../hooks/useNow'

interface Props {
  sessionKey: string
  onStop: (seconds: number) => void
}

/** Stopwatch that survives app switches: the start timestamp is stored, elapsed time is derived. */
export function Stopwatch({ sessionKey, onStop }: Props) {
  const key = `stopwatch:${sessionKey}`
  const startedAt = useLiveQuery(() => getMeta<number>(key), [key])
  const now = useNow()
  const running = typeof startedAt === 'number'
  const elapsed = running ? (now - startedAt) / 1000 : 0
  return (
    <>
      <p className="rest-clock">{formatClock(elapsed)}</p>
      <div className="actionbar">
        {running ? (
          <button
            className="primary"
            onClick={async () => {
              const secs = Math.round((Date.now() - startedAt) / 1000)
              await deleteMeta(key)
              onStop(secs)
            }}
          >
            Stopp
          </button>
        ) : (
          <button
            className="primary"
            onClick={() => {
              unlockAudio()
              void setMeta(key, Date.now())
            }}
          >
            Start
          </button>
        )}
      </div>
    </>
  )
}
