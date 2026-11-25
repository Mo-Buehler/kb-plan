import type { Step } from './steps'

/** One strong colour per kind of session or block (see design.css). Ampel colours are not part of this. */
export type Tone = 'kb' | 'bike' | 'knee' | 'ball' | 'weight' | 'fin' | 'warm' | 'cool' | 'solo' | 'rest'

export function toneOfKind(kind: string): Tone {
  switch (kind) {
    case 'kb-a':
    case 'kb-b':
    case 'workout-c':
    case 'swing-test':
      return 'kb'
    case 'bike':
    case 'ftp-test':
    case 'outdoor-ride':
      return 'bike'
    case 'knee':
    case 'knee-check':
      return 'knee'
    case 'football':
      return 'ball'
    case 'rest':
      return 'rest'
    default:
      return 'weight' // measurements, drills and other tasks
  }
}

/** Block colour inside a kettlebell session: supersets orange, single exercises cyan, and so on. */
export function stepTone(step: Pick<Step, 'block' | 'group'>): Tone {
  switch (step.block) {
    case 'warmup':
      return 'warm'
    case 'knee':
      return 'knee'
    case 'finisher':
      return 'fin'
    case 'cooldown':
      return 'cool'
    default:
      return (step.group ?? 1) <= 2 ? 'kb' : 'solo'
  }
}

export const TONE_ICON: Record<Tone, string> = {
  kb: 'kb',
  bike: 'bike',
  knee: 'pulse',
  ball: 'ball',
  weight: 'scale',
  fin: 'bolt',
  warm: 'flame',
  cool: 'leaf',
  solo: 'walk',
  rest: 'moon',
}

export const SHORT_LABEL: Record<string, string> = {
  'kb-a': 'KB A',
  'kb-b': 'KB B',
  'workout-c': 'Workout C',
  bike: 'Rad',
  'ftp-test': 'FTP',
  'outdoor-ride': 'Rad',
  knee: 'Knie',
  'knee-check': 'Check',
  football: 'Kick',
  rest: 'Ruhe',
  measurement: 'Messung',
  'swing-test': 'Test',
  'hinge-drill': 'Drill',
  task: 'Aufgabe',
}
