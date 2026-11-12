import type { ReactNode } from 'react'
import { todayIso } from '../../domain/plan'
import { compliance, kbHistory, series } from '../../domain/progress'
import { useSchedule } from '../../hooks/useSchedule'
import { ComplianceChart, KbChart, SimpleLine } from './charts'
import { MeasureEntry } from './MeasureEntry'
import { currentSuggestions, RuleHints } from './RuleHints'
import { WeightSection } from './WeightSection'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card stack">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function ProgressPage() {
  const data = useSchedule()
  if (!data) return null
  const ms = data.measurements
  const last: Record<string, number> = {}
  for (const m of [...ms].sort((a, b) => a.date.localeCompare(b.date))) last[m.kind] = m.value

  return (
    <main className="page">
      <h1>Fortschritt</h1>
      <div className="stack">
        <RuleHints suggestions={currentSuggestions(data)} />
        <Section title="Körpergewicht">
          <WeightSection measurements={ms} />
        </Section>
        <Section title="Messwert eintragen">
          <MeasureEntry last={last} />
        </Section>
        <Section title="Taillenumfang">
          <SimpleLine data={series(ms, 'waist')} unit="cm" digits={1} label="Taille" />
        </Section>
        <Section title="FTP">
          <SimpleLine data={series(ms, 'ftp')} unit="W" label="FTP" />
        </Section>
        <Section title="Swing-Test (100 × 24 kg)">
          <SimpleLine data={series(ms, 'swing-test')} unit="s" label="Zeit" />
        </Section>
        <Section title="Workout C: Runden">
          <SimpleLine data={series(ms, 'workout-c-rounds')} unit="Runden" label="Runden" />
        </Section>
        {ms.some((m) => m.kind === 'resting-hr') && (
          <Section title="Ruhepuls">
            <SimpleLine data={series(ms, 'resting-hr')} unit="bpm" label="Ruhepuls" />
          </Section>
        )}
        <Section title="Kettlebell: Gewicht und Volumen">
          <KbChart history={kbHistory(data.setLogs)} />
        </Section>
        <Section title="Erfüllungsquote pro Woche">
          <ComplianceChart data={compliance(data.logs, data.moves, data.tiers, todayIso())} />
        </Section>
      </div>
    </main>
  )
}
