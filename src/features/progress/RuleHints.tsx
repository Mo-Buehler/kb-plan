import { saveOverride } from '../../db/planEdit'
import { setMeta } from '../../db/sessions'
import { seed, todayIso } from '../../domain/plan'
import { footballSuggestion, keepWeightSuggestions, kneeSuggestions, type Suggestion } from '../../domain/rules'
import type { ScheduleData } from '../../hooks/useSchedule'

/** Rule hints for the current week that the user has not answered yet. */
export function currentSuggestions(data: ScheduleData, today = todayIso()): Suggestion[] {
  const week = seed.weeks.find((w) => today >= w.start && today <= w.end)?.week
  const all: Suggestion[] = footballSuggestion(data.logs, today, data.mondayWorkoutC)
  if (week) {
    for (const wk of ['A', 'B'] as const) all.push(...keepWeightSuggestions(week, wk, data.setLogs, data.overrides))
    all.push(...kneeSuggestions(week, data.logs, data.overrides))
  }
  return all.filter((s) => !data.dismissed.has(s.id))
}

async function accept(s: Suggestion) {
  if (s.kind === 'workout-c') await setMeta('mondayWorkoutC', true)
  for (const [exerciseId, weights] of Object.entries(s.keepWeights ?? {}))
    await saveOverride({ exerciseId, fromWeek: s.week, scope: 'week', patch: { weights } })
  await setMeta(`rule-dismissed:${s.id}`, true)
}

const dismiss = (s: Suggestion) => setMeta(`rule-dismissed:${s.id}`, true)

/** Proposals only: nothing changes until the user confirms. */
export function RuleHints({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions.length) return null
  return (
    <div className="stack">
      {suggestions.map((s) => {
        const canApply = s.kind === 'workout-c' || Object.keys(s.keepWeights ?? {}).length > 0
        return (
          <section key={s.id} className="card stack hint">
            <h2>{s.title}</h2>
            <p>{s.detail}</p>
            <div className="btnrow">
              {canApply && (
                <button className="primary" onClick={() => void accept(s)}>
                  Ja, übernehmen
                </button>
              )}
              <button onClick={() => void dismiss(s)}>{canApply ? 'Nein, Plan behalten' : 'Verstanden'}</button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
