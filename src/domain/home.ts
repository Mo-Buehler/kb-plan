import type { Measurement, SessionLog, SetLog } from '../db/db'
import { average7, kbHistory, valuesByDate, type WeekCompliance } from './progress'
import { addDays } from './schedule'
import { seed } from './plan'

const ts = (iso: string) => Date.parse(iso + 'T12:00:00Z')

// ---------- motivation ----------

const DAILY = [
  'Heute zählt nur der nächste Satz.',
  'Konstanz schlägt Motivation.',
  'Kleine Schritte, große Wirkung.',
  'Dein zukünftiges Ich schaut dir zu.',
  'Technik zuerst, dann das Gewicht.',
  'Jeder Haken im Plan ist ein Beweis.',
  'Nicht perfekt, sondern dabei.',
  'Stark wird man in den Wiederholungen.',
  'Atme ruhig, press kräftig.',
  'Du musst nicht schnell sein, nur dranbleiben.',
  'Ein guter Tag zum Stärkerwerden.',
  'Was du heute tust, trägt dich im Frühjahr.',
  'Sauber ausgeführt ist halb gewonnen.',
  'Fang an, der Rest kommt von allein.',
  'Disziplin ist Selbstfürsorge.',
  'Deine Knie danken dir für die Kraft.',
]

export interface MotivationContext {
  date: string
  state: 'before' | 'running' | 'after'
  daysUntilStart?: number
  deload?: boolean
  test?: boolean
  phaseStart?: boolean
  rest?: boolean
  done?: boolean
}

/** One short line for the day; special days get a fitting message, otherwise it rotates by date. */
export function dailyMotivation(c: MotivationContext): string {
  if (c.state === 'before') return `Noch ${c.daysUntilStart} Tage bis zum Start. Material bereit, Kopf frei.`
  if (c.state === 'after') return 'Plan geschafft. Das hast du dir erarbeitet.'
  if (c.done) return 'Stark! Einheit erledigt. Jetzt gut essen und erholen.'
  if (c.phaseStart) return 'Neue Phase, neuer Reiz. Los geht es!'
  if (c.test) return 'Testwoche: Zeig, was du aufgebaut hast.'
  if (c.deload) return 'Entlastungswoche: Erholung ist Teil des Trainings.'
  if (c.rest) return 'Ruhetag: Muskeln wachsen in der Pause.'
  let h = 0
  for (const ch of c.date) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return DAILY[h % DAILY.length]
}

// ---------- streak and badges ----------

/** Consecutive finished weeks (counting back from the latest) in which at least 80 % of the sessions were done. */
export function streakWeeks(comp: WeekCompliance[], today: string, minShare = 0.8): number {
  const finished = comp.filter((c) => c.week >= 1 && (seed.weeks.find((w) => w.week === c.week)?.end ?? '9') < today && c.planned > 0)
  let n = 0
  for (const c of [...finished].reverse()) {
    if (c.done / c.planned >= minShare) n++
    else break
  }
  return n
}

export interface Badge {
  id: string
  label: string
  hint: string
  earned: boolean
  tone: 'kb' | 'bike' | 'knee' | 'ball' | 'weight' | 'fin'
  icon: string
}

export function badges(logs: SessionLog[], comp: WeekCompliance[], ms: Measurement[], today: string): Badge[] {
  const done = logs.filter((l) => l.status === 'done')
  const kb = done.filter((l) => /:kb-[ab]$/.test(l.sessionKey)).length
  const rides = done.filter((l) => /:(bike|ftp-test|outdoor-ride)$/.test(l.sessionKey)).length
  const fullWeek = comp.some((c) => c.planned > 0 && c.done >= c.planned)
  const streak = streakWeeks(comp, today)
  const phase1End = seed.phases[0].end
  const phase1 = comp.filter((c) => c.week >= 1 && c.week <= 4)
  const phase1Done = today > phase1End && phase1.length === 4 && phase1.every((c) => c.planned > 0 && c.done / c.planned >= 0.8)
  return [
    { id: 'first', label: 'Erste Einheit', hint: 'Eine Einheit abschließen', earned: done.length >= 1, tone: 'kb', icon: 'kb' },
    { id: 'ten', label: '10 Einheiten', hint: '10 Einheiten abschließen', earned: done.length >= 10, tone: 'fin', icon: 'bolt' },
    { id: 'week', label: 'Volle Woche', hint: 'Alle Einheiten einer Woche', earned: fullWeek, tone: 'ball', icon: 'target' },
    { id: 'streak', label: '4er-Serie', hint: '4 starke Wochen in Folge', earned: streak >= 4, tone: 'knee', icon: 'flame' },
    { id: 'ride', label: '10 Ausfahrten', hint: '10 Rad-Einheiten', earned: rides >= 10, tone: 'bike', icon: 'bike' },
    { id: 'kb25', label: '25 Kettlebell', hint: '25 Kettlebell-Einheiten', earned: kb >= 25, tone: 'kb', icon: 'kb' },
    { id: 'ftp', label: 'FTP gemessen', hint: 'Einen FTP-Test eintragen', earned: ms.some((m) => m.kind === 'ftp'), tone: 'bike', icon: 'pulse' },
    { id: 'phase1', label: 'Basis geschafft', hint: 'Phase 1 mit 80 % abschließen', earned: phase1Done, tone: 'weight', icon: 'scale' },
  ]
}

// ---------- chart data ----------

export interface SparkData {
  points: { t: number; v: number }[]
  targets: { t: number; v: number }[]
  min: number
  max: number
}

/** Last 5 weeks of the 7-day average with the weekly targets in the same time frame. */
export function weightSpark(ms: Measurement[], today: string, days = 35): SparkData | null {
  const byDate = valuesByDate(ms, 'weight')
  const from = addDays(today, -days)
  const points = [...byDate.keys()]
    .filter((d) => d >= from && d <= today)
    .sort()
    .map((d) => ({ t: ts(d), v: Math.round(average7(d, byDate)! * 10) / 10 }))
  if (points.length < 2) return null
  const targets = seed.weightTargets.filter((w) => w.sunday >= from && w.sunday <= addDays(today, 14)).map((w) => ({ t: ts(w.sunday), v: w.target }))
  const all = [...points.map((p) => p.v), ...targets.map((p) => p.v)]
  return { points, targets, min: Math.min(...all), max: Math.max(...all) }
}

/** Kettlebell volume (reps x kg) for the last `n` weeks up to and including `week`. */
export function weeklyVolumes(setLogs: SetLog[], week: number, n = 5): { week: number; volume: number }[] {
  const per = new Map<number, number>()
  for (const points of kbHistory(setLogs).values()) for (const p of points) per.set(p.week, (per.get(p.week) ?? 0) + p.volume)
  const out = []
  for (let w = Math.max(1, week - n + 1); w <= week; w++) out.push({ week: w, volume: per.get(w) ?? 0 })
  return out
}

/** Share of the 16-week plan that has passed, including the current week's days. */
export function planShare(today: string): number {
  const start = ts(seed.planStart)
  const end = ts(seed.planEnd) + 86400000
  return Math.min(1, Math.max(0, (ts(today) + 86400000 - start) / (end - start)))
}
