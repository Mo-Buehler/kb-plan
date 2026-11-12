import type { SessionItem } from './plan'

const TITLES: Record<string, string> = {
  football: 'Fußball',
  knee: 'Knie-Programm und Mobility',
  rest: 'Ruhetag',
  'kb-a': 'Kettlebell Workout A',
  'kb-b': 'Kettlebell Workout B',
  bike: 'Rad in MyWhoosh',
  'ftp-test': 'FTP-Test',
  measurement: 'Ausgangsmessung',
  task: 'Aufgabe',
  'hinge-drill': 'Hinge-Drill',
  'swing-test': 'Swing-Test und Abschlussmessung',
  'outdoor-ride': 'Rennrad draußen',
}

export function sessionTitle(s: SessionItem): string {
  const item = s as Record<string, unknown>
  if (s.kind === 'bike') return String(item.workout)
  if (s.kind === 'kb-a' || s.kind === 'kb-b') return TITLES[s.kind] + (item.deload ? ' (Deload)' : '')
  return TITLES[s.kind] ?? s.label
}
