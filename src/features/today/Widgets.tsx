import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { SHORT_LABEL, toneOfKind } from '../../domain/colors'
import { formatDate } from '../../domain/format'
import { checklistGroups, shoppingGroups } from '../../domain/lists'
import { Icon } from '../../components/Icon'
import { BadgeIcon, HeroArt, MiniBars, PhaseTimeline, Ring, Sparkline } from '../../components/Visuals'
import { weightTile, weekQuota } from '../../domain/dashboard'
import { formatNumber } from '../../domain/format'
import { badges, dailyMotivation, planShare, streakWeeks, weeklyVolumes, weightSpark, type MotivationContext } from '../../domain/home'
import { compliance } from '../../domain/progress'
import { seed, type Week } from '../../domain/plan'
import type { ScheduleData } from '../../hooks/useSchedule'

export function MotivationBanner({ ctx }: { ctx: MotivationContext }) {
  return (
    <section className="motiv" aria-label="Motivation des Tages">
      <Icon name="bolt" large />
      <div>
        <p className="kicker">Motivation</p>
        <p className="quote">{dailyMotivation(ctx)}</p>
      </div>
    </section>
  )
}

/** Four coloured stat tiles: week ring, streak, and the weight curve across the full width. */
export function StatGrid({ data, today, week }: { data: ScheduleData; today: string; week: Week }) {
  const comp = compliance(data.logs, data.moves, data.tiers, today)
  const q = weekQuota(data.logs, data.moves, data.tiers, today, week.week)
  const share = q.current && q.current.planned ? q.current.done / q.current.planned : 0
  const streak = streakWeeks(comp, today)
  const w = weightTile(data.measurements, today)
  const spark = weightSpark(data.measurements, today)
  const state = { above: 'über dem Korridor', below: 'unter dem Korridor', within: 'im Korridor', none: '' }[w.status]
  return (
    <div className="statgrid">
      <Link to="/kalender" className="tile tone-ball ringtile" aria-label="Diese Woche">
        <Ring share={share} label={q.current ? `${q.current.done}/${q.current.planned}` : '–'} size={84} />
        <div className="ringtxt">
          <p className="kicker" style={{ display: 'block' }}>
            Diese Woche
          </p>
          <p>{q.previousPct !== undefined ? `Letzte Woche ${q.previousPct} %` : 'Einheiten erledigt'}</p>
        </div>
      </Link>
      <div className="tile tone-fin streak">
        <div className="kicker">
          <span>Serie</span>
          <Icon name="flame" />
        </div>
        <p className="num">{streak}</p>
        <p>{streak === 1 ? 'starke Woche in Folge' : 'starke Wochen in Folge'}</p>
      </div>
      <Link to="/fortschritt" className="tile tone-weight wide">
        <div className="sparkhead">
          <span className="kicker">Gewicht</span>
          <Icon name="scale" />
        </div>
        <div className="sparkhead">
          <p className="num">{w.value === null ? '–' : formatNumber(w.value, 'kg')}</p>
          <p>{w.value === null ? 'Noch kein Wert' : `Ziel ${formatNumber(w.target)} · ${state}`}</p>
        </div>
        <div className="spark">{spark ? <Sparkline data={spark} /> : <p>Trage dein Gewicht ein, dann erscheint hier deine Kurve.</p>}</div>
      </Link>
    </div>
  )
}

export function PlanCard({ week, today, preview = false }: { week: Week; today: string; preview?: boolean }) {
  const pct = Math.round(planShare(today) * 100)
  const phase = seed.phases.find((p) => p.id === week.phase)
  return (
    <section className="card">
      <div className="sectitle">
        <h2>Dein Plan</h2>
        <span className="muted" style={{ margin: 0 }}>
          {preview ? '16 Wochen · 4 Phasen' : `Woche ${week.week} von 16 · ${pct} %`}
        </span>
      </div>
      <PhaseTimeline currentWeek={preview ? 0 : week.week} />
      {phase && (
        <p className="muted" style={{ margin: '.6rem 0 0' }}>
          {preview ? 'Start' : 'Jetzt'}: {phase.name}. Kettlebell: {phase.kbFocus}.
        </p>
      )}
    </section>
  )
}

export function VolumeCard({ data, week }: { data: ScheduleData; week: Week }) {
  const vols = weeklyVolumes(data.setLogs, week.week)
  const total = vols.at(-1)?.volume ?? 0
  const prev = vols.at(-2)?.volume ?? 0
  return (
    <section className="card tone-kb">
      <div className="sectitle">
        <h2>Kettlebell-Volumen</h2>
        <span className="muted" style={{ margin: 0 }}>
          {total ? `${formatNumber(total, 'kg', 0)} diese Woche` : 'Noch nichts erfasst'}
          {total && prev ? ` (${total >= prev ? '+' : '−'}${Math.abs(Math.round(((total - prev) / prev) * 100))} %)` : ''}
        </span>
      </div>
      <MiniBars data={vols} />
    </section>
  )
}

export function BadgeCard({ data, today }: { data: ScheduleData; today: string }) {
  const list = badges(data.logs, compliance(data.logs, data.moves, data.tiers, today), data.measurements, today)
  const earned = list.filter((b) => b.earned).length
  return (
    <section className="card">
      <div className="sectitle">
        <h2>Abzeichen</h2>
        <span className="muted" style={{ margin: 0 }}>
          {earned} von {list.length}
        </span>
      </div>
      <div className="badges">
        {list.map((b) => (
          <div key={b.id} className={`achv tone-${b.tone} ${b.earned ? 'on' : ''}`} title={b.hint}>
            <BadgeIcon icon={b.icon} earned={b.earned} />
            <span>{b.label}</span>
            {!b.earned && <span className="sr-only">Noch nicht erreicht: {b.hint}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

const REL_KINDS = ['football', 'knee', 'kb-a', 'bike', 'rest', 'kb-b', 'bike']

/** Landing content before the plan starts: countdown, preparation progress and the weekly rhythm. */
export function PreStart({ days }: { days: number }) {
  const checks = useLiveQuery(() => db.checkStates.toArray(), [])
  const done = new Set((checks ?? []).filter((c) => c.done).map((c) => c.key))
  const lists = [checklistGroups(), shoppingGroups()].map((g) => g.flatMap((x) => x.entries))
  const [check, shop] = lists.map((l) => ({ done: l.filter((e) => done.has(e.id)).length, total: l.length }))
  const goal = seed.weightTargets.at(-1)!
  const week1 = seed.weeks[1]
  return (
    <>
      <section className="tile hero tone-kb">
        <div className="kicker">
          <span>Countdown</span>
          <Icon name="flame" large />
        </div>
        <HeroArt icon="kb" />
        <p className="big">Noch {days} {days === 1 ? 'Tag' : 'Tage'}</p>
        <p>bis zur Vorbereitungswoche am {formatDate(seed.weeks[0].start)}. Planstart ist am {formatDate(seed.planStart)}.</p>
        <div className="chips">
          <span>16 Wochen</span>
          <span>4 Phasen</span>
          <span>Ziel {formatNumber(goal.target)} kg</span>
        </div>
      </section>
      <div className="statgrid">
        <Link to="/mehr/einkauf" className="tile tone-weight ringtile">
          <Ring share={shop.total ? shop.done / shop.total : 0} label={`${shop.done}/${shop.total}`} size={84} />
          <div className="ringtxt">
            <p className="kicker" style={{ display: 'block' }}>
              Einkauf
            </p>
            <p>Material bestellt</p>
          </div>
        </Link>
        <Link to="/mehr/checklisten" className="tile tone-ball ringtile">
          <Ring share={check.total ? check.done / check.total : 0} label={`${check.done}/${check.total}`} size={84} />
          <div className="ringtxt">
            <p className="kicker" style={{ display: 'block' }}>
              Checkliste
            </p>
            <p>Vorbereitung erledigt</p>
          </div>
        </Link>
      </div>
      <section className="card">
        <div className="sectitle">
          <h2>So sieht deine Woche aus</h2>
        </div>
        <div className="strip">
          {week1.days.map((d, i) => {
            const kind = REL_KINDS[i]
            return (
              <span key={d.date} className={`chipday tone-${toneOfKind(kind)} ${kind === 'rest' ? 'restchip' : ''}`}>
                <span>{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i]}</span>
                <span>{SHORT_LABEL[kind]}</span>
              </span>
            )
          })}
        </div>
      </section>
    </>
  )
}
