import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { makeSessionKey } from '../../db/sessions'
import { toneOfKind } from '../../domain/colors'
import { sessionTitle } from '../../domain/labels'
import { locate } from '../../domain/plan'
import { buildKbSteps } from '../../domain/steps'
import { useSchedule } from '../../hooks/useSchedule'
import { AmrapSession } from './AmrapSession'
import { BikeSession } from './BikeSession'
import { Overview } from './Overview'
import { OtherSession } from './OtherSession'
import { StepRunner } from './StepRunner'

/** /einheit/:date[/:kind]: picks the right runner for the planned session of that day. */
export function SessionPage() {
  const { date = '', kind: override } = useParams()
  const navigate = useNavigate()
  const pos = useMemo(() => locate(date), [date])
  const close = () => navigate('/')

  const schedule = useSchedule()
  const [params, setParams] = useSearchParams()
  if (!schedule) return null
  if (pos.state !== 'running') return <p className="page">Für dieses Datum gibt es keine Einheit.</p>
  const { week, day } = pos
  const session = day.session
  const kind = override ?? session.kind
  const sessionKey = makeSessionKey(date, kind)

  if (kind === 'kb-a' || kind === 'kb-b') {
    const steps = buildKbSteps(week.week, kind === 'kb-a' ? 'A' : 'B', schedule.overrides)
    const title = sessionTitle(session)
    // The overview comes first; once a set is logged (or the user pressed start) the runner takes over.
    const underway = schedule.setLogs.some((l) => l.sessionKey === sessionKey) || params.get('los') === '1'
    if (!underway)
      return (
        <Overview
          title={title}
          subtitle={`Woche ${week.week}`}
          tone={toneOfKind(kind)}
          steps={steps}
          onBack={close}
          onStart={() => setParams({ los: '1' }, { replace: true })}
        />
      )
    return <StepRunner sessionKey={sessionKey} date={date} title={title} steps={steps} onClose={close} />
  }
  if (kind === 'workout-c') return <AmrapSession sessionKey={sessionKey} date={date} week={week} onClose={close} />
  if (kind === 'bike' || kind === 'ftp-test' || kind === 'outdoor-ride')
    return <BikeSession sessionKey={sessionKey} date={date} session={session} onClose={close} />
  return <OtherSession sessionKey={sessionKey} date={date} session={session} onClose={close} />
}
