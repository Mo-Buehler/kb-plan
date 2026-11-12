import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { formatDate, weekdayName } from '../../domain/format'
import { sessionTitle } from '../../domain/labels'
import { locate, seed, todayIso } from '../../domain/plan'
import { itemsForDate, type ScheduledItem } from '../../domain/schedule'
import { useSchedule, type ScheduleData } from '../../hooks/useSchedule'
import { currentSuggestions, RuleHints } from '../progress/RuleHints'
import { Reminders } from './Reminders'
import { HeroTile, NextTile, sessionKeyOf, StatTiles, WeekStrip } from './Tiles'

/** Show a hint only on the day it matters: the matching workout, Wednesday for knee hints, Monday for Workout C. */
function relevant(s: { kind: string; workout?: string }, today: ScheduledItem[], dow: string): boolean {
  const kinds = today.map((i) => i.kind)
  if (s.kind === 'keep-weight') return kinds.includes(s.workout === 'A' ? 'kb-a' : 'kb-b')
  if (s.kind === 'knee-legs') return kinds.includes('kb-a')
  return dow === 'mo'
}

export function TodayPage({ name }: { name: string }) {
  const iso = todayIso()
  const pos = locate(iso)
  const data = useSchedule()
  if (!data) return null
  const { items, movedAway } = itemsForDate(iso, data.moves, data.tiers)
  const visible = items.filter((i) => !i.hiddenReason)
  const hidden = items.filter((i) => i.hiddenReason)

  return (
    <main className="page">
      <h1>Hallo {name}</h1>
      <p className="muted">
        {weekdayName(iso)}, {formatDate(iso)}
        {pos.state === 'running' &&
          ` · Woche ${pos.week.week}${pos.week.phase ? ` · Phase ${pos.week.phase}` : ''}${pos.week.deload ? ' · Deload' : ''}${data.tiers[pos.week.week] ? ` · ${data.tiers[pos.week.week] === 'compact' ? 'Kompakt' : 'Minimum'}` : ''}`}
      </p>
      <Reminders />
      <div className="stack">
        {pos.state === 'before' && (
          <section className="card">
            <h2>Der Plan startet bald</h2>
            <p>
              Noch {pos.daysUntilStart} Tage bis zur Vorbereitungswoche am {formatDate(seed.weeks[0].start)}.
            </p>
          </section>
        )}
        {pos.state === 'after' && (
          <section className="card">
            <h2>Plan abgeschlossen</h2>
            <p>Das Planende war am {formatDate(seed.planEnd)}.</p>
          </section>
        )}
        {pos.state === 'running' && (
          <>
            {pos.week.deload && <p className="notice">Entlastungswoche: nur die angegebenen Sätze, kein Zusatztraining.</p>}
            {pos.phaseStart && <p className="notice">Erster Tag einer neuen Phase.</p>}
            <RuleHints suggestions={currentSuggestions(data, iso).filter((s) => relevant(s, visible, pos.day.dow))} />
            {visible.map((it, i) => (
              <Hero key={it.originDate + it.kind} item={it} week={pos.week} data={data} first={i === 0} />
            ))}
            {visible.length === 0 && <p className="card">Heute steht nichts an.</p>}
            {movedAway.map((m) => (
              <p key={m.kind} className="muted">
                {sessionTitle(m.session)} wurde auf {formatDate(m.toDate)} verschoben.
              </p>
            ))}
            {hidden.map((h) => (
              <p key={h.kind} className="muted">
                {sessionTitle(h.session)}: {h.hiddenReason}
              </p>
            ))}
            <StatTiles data={data} today={iso} week={pos.week.week} />
            <WeekStrip week={pos.week} data={data} today={iso} />
            <NextTile data={data} today={iso} />
          </>
        )}
      </div>
    </main>
  )
}

function Hero({ item, week, data, first }: { item: ScheduledItem; week: (typeof seed.weeks)[number]; data: ScheduleData; first: boolean }) {
  const key = sessionKeyOf(item)
  const started = useLiveQuery(() => db.setLogs.where('sessionKey').equals(key).count(), [key])
  const workoutCLink = 'alternative' in item.session || (data.mondayWorkoutC && item.kind === 'football')
  return <HeroTile item={item} week={week} data={data} started={!!started} workoutCLink={workoutCLink} label={first ? 'Heute' : 'Außerdem heute'} />
}
