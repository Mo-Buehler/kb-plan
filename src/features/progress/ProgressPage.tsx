import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import type { Tone } from '../../domain/colors'
import { weightTile } from '../../domain/dashboard'
import { formatNumber } from '../../domain/format'
import { locate, todayIso } from '../../domain/plan'
import { compliance, kbHistory, series } from '../../domain/progress'
import { useSchedule } from '../../hooks/useSchedule'
import { ComplianceChart, KbChart, SimpleLine } from './charts'
import { MeasureEntry } from './MeasureEntry'
import { currentSuggestions, RuleHints } from './RuleHints'
import { WeightSection } from './WeightSection'

function Section({ title, tone, icon, children }: { title: string; tone: Tone; icon: string; children: ReactNode }) {
  return (
    <section className={`card stack tone-${tone}`}>
      <div className="sechead">
        <span className="badgeicon">
          <Icon name={icon} />
        </span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Kpi({ tone, icon, label, value, note }: { tone: Tone; icon: string; label: string; value: string; note: string }) {
  return (
    <div className={`tile tone-${tone}`}>
      <div className="kicker">
        <span>{label}</span>
        <Icon name={icon} />
      </div>
      <p className="num">{value}</p>
      <p>{note}</p>
    </div>
  )
}

export function ProgressPage() {
  const data = useSchedule()
  if (!data) return null
  const ms = data.measurements
  const today = todayIso()
  const last: Record<string, number> = {}
  for (const m of [...ms].sort((a, b) => a.date.localeCompare(b.date))) last[m.kind] = m.value
  const w = weightTile(ms, today)
  const pos = locate(today)
  const quota = compliance(data.logs, data.moves, data.tiers, today).find((c) => pos.state === 'running' && c.week === pos.week.week)
  const ftp = series(ms, 'ftp')
  const waist = series(ms, 'waist')

  return (
    <main className="page">
      <h1>Fortschritt</h1>
      <div className="stack">
        <div className="tiles2">
          <Kpi tone="weight" icon="scale" label="Gewicht" value={w.value === null ? '–' : formatNumber(w.value, 'kg')} note={`Ziel ${formatNumber(w.target)} kg`} />
          <Kpi tone="bike" icon="bike" label="FTP" value={ftp.length ? `${ftp.at(-1)!.value} W` : '–'} note={ftp.length > 1 ? `Start ${ftp[0].value} W` : 'Noch kein Test'} />
          <Kpi tone="knee" icon="pulse" label="Taille" value={waist.length ? formatNumber(waist.at(-1)!.value, 'cm') : '–'} note={waist.length > 1 ? `Start ${formatNumber(waist[0].value)} cm` : 'Noch kein Wert'} />
          <Kpi tone="ball" icon="target" label="Diese Woche" value={quota ? `${quota.done} von ${quota.planned}` : '–'} note="Einheiten erledigt" />
        </div>
        <RuleHints suggestions={currentSuggestions(data)} />
        <Section title="Körpergewicht" tone="weight" icon="scale">
          <WeightSection measurements={ms} />
        </Section>
        <Section title="Messwert eintragen" tone="weight" icon="chart">
          <MeasureEntry last={last} />
        </Section>
        <Section title="Taillenumfang" tone="knee" icon="pulse">
          <SimpleLine data={waist} unit="cm" digits={1} label="Taille" />
        </Section>
        <Section title="FTP" tone="bike" icon="bike">
          <SimpleLine data={ftp} unit="W" label="FTP" />
        </Section>
        <Section title="Swing-Test (100 × 24 kg)" tone="kb" icon="kb">
          <SimpleLine data={series(ms, 'swing-test')} unit="s" label="Zeit" />
        </Section>
        <Section title="Workout C: Runden" tone="kb" icon="bolt">
          <SimpleLine data={series(ms, 'workout-c-rounds')} unit="Runden" label="Runden" />
        </Section>
        {ms.some((m) => m.kind === 'resting-hr') && (
          <Section title="Ruhepuls" tone="fin" icon="pulse">
            <SimpleLine data={series(ms, 'resting-hr')} unit="bpm" label="Ruhepuls" />
          </Section>
        )}
        <Section title="Kettlebell: Gewicht und Volumen" tone="kb" icon="kb">
          <KbChart history={kbHistory(data.setLogs)} />
        </Section>
        <Section title="Erfüllungsquote pro Woche" tone="ball" icon="target">
          <ComplianceChart data={compliance(data.logs, data.moves, data.tiers, today)} />
        </Section>
      </div>
    </main>
  )
}
