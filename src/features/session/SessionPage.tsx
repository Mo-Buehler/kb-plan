import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { makeSessionKey } from '../../db/sessions'
import { sessionTitle } from '../../domain/labels'
import { locate } from '../../domain/plan'
import { buildKbSteps, buildKneeSteps } from '../../domain/steps'
import { AmrapSession } from './AmrapSession'
import { BikeSession } from './BikeSession'
import { OtherSession } from './OtherSession'
import { StepRunner } from './StepRunner'

/** /einheit/:date[/:kind]: picks the right runner for the planned session of that day. */
export function SessionPage() {
  const { date = '', kind: override } = useParams()
  const navigate = useNavigate()
  const pos = useMemo(() => locate(date), [date])
  const close = () => navigate('/')

  if (pos.state !== 'running') return <p className="page">Für dieses Datum gibt es keine Einheit.</p>
  const { week, day } = pos
  const session = day.session
  const kind = override ?? session.kind
  const sessionKey = makeSessionKey(date, kind)

  if (kind === 'kb-a' || kind === 'kb-b') {
    const steps = buildKbSteps(week.week, kind === 'kb-a' ? 'A' : 'B')
    return <StepRunner sessionKey={sessionKey} date={date} title={sessionTitle(session)} steps={steps} onClose={close} />
  }
  if (kind === 'knee')
    return <StepRunner sessionKey={sessionKey} date={date} title="Knie-Programm" steps={buildKneeSteps(week.phase!, 'tue')} onClose={close} />
  if (kind === 'workout-c') return <AmrapSession sessionKey={sessionKey} date={date} week={week} onClose={close} />
  if (kind === 'bike' || kind === 'ftp-test' || kind === 'outdoor-ride')
    return <BikeSession sessionKey={sessionKey} date={date} session={session} onClose={close} />
  return <OtherSession sessionKey={sessionKey} date={date} session={session} onClose={close} />
}
