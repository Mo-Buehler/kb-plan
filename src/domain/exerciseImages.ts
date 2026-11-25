/** Exercises that can carry a private photo (up to two per exercise: start and end). */
export interface ExerciseSlot {
  slug: string
  label: string
  where: string
}

export const EXERCISE_SLOTS: ExerciseSlot[] = [
  { slug: 'kreuzheben', label: 'KB-Kreuzheben', where: 'KB A' },
  { slug: 'swing', label: 'Swing und Hike Pass', where: 'KB B, Workout C' },
  { slug: 'clean', label: 'Clean', where: 'KB B' },
  { slug: 'einbeiniges-kreuzheben', label: 'Einbeiniges Kreuzheben', where: 'KB B' },
  { slug: 'goblet-squat', label: 'Goblet Squat', where: 'KB A' },
  { slug: 'front-squat', label: 'Doppel-Front-Squat', where: 'KB A' },
  { slug: 'split-squat', label: 'Split Squat', where: 'KB B' },
  { slug: 'reverse-lunge', label: 'Reverse Lunge (optional)', where: 'KB B' },
  { slug: 'farmer-carry', label: 'Farmer Carry', where: 'KB A' },
  { slug: 'suitcase-carry', label: 'Suitcase Carry', where: 'KB B' },
  { slug: 'rudern', label: 'Rudern', where: 'KB A, KB B' },
  { slug: 'floor-press', label: 'Floor Press', where: 'KB A' },
  { slug: 'ueberkopfdruecken', label: 'Drücken über Kopf', where: 'KB B' },
  { slug: 'liegestuetz', label: 'Liegestütz', where: 'KB B' },
  { slug: 'dead-bug', label: 'Dead Bug', where: 'KB A' },
  { slug: 'seitstuetz', label: 'Seitstütz', where: 'KB B, Knie-Block' },
  { slug: 'hammer-curl', label: 'Hammer Curl', where: 'Arm-Finisher KB A' },
  { slug: 'horn-curl', label: 'Horn Curl', where: 'Arm-Finisher KB B' },
  { slug: 'trizepsdruecken-ueberkopf', label: 'Trizepsdrücken über Kopf', where: 'Arm-Finisher KB A' },
  { slug: 'trizepsstrecken-liegend', label: 'Trizepsstrecken liegend', where: 'Arm-Finisher KB B' },
  { slug: 'wadenheben-stehend', label: 'Wadenheben, gestrecktes Knie', where: 'Knie-Block Mittwoch' },
  { slug: 'wadenheben-sitzend', label: 'Wadenheben, gebeugtes Knie', where: 'Knie-Block Samstag' },
  { slug: 'clamshell', label: 'Clamshell', where: 'Knie-Block Mittwoch' },
  { slug: 'seitliches-gehen', label: 'Seitliches Gehen', where: 'Knie-Block' },
  { slug: 'hamstring-curl', label: 'Hamstring Curl am Boden', where: 'Knie-Block Mittwoch' },
  { slug: 'glute-bridge-einbeinig', label: 'Einbeinige Glute Bridge', where: 'Knie-Block Samstag' },
  { slug: 'wandsitzen', label: 'Wandsitzen', where: 'Knie-Block Samstag' },
  { slug: 'step-down', label: 'Step-down', where: 'Knie-Block Samstag' },
]

const SLUGS = new Set(EXERCISE_SLOTS.map((s) => s.slug))

const EXT = /\.(jpe?g|png|webp|avif|heic|heif|gif)$/

/**
 * "Goblet Squat.JPG" -> goblet-squat, "goblet-squat-start.jpg" -> goblet-squat (image 1),
 * "goblet-squat-ende.jpg" -> goblet-squat (image 2), "horn-curl.jpg.png" -> horn-curl.
 * Returns null when the name matches no exercise.
 */
export function parseImageFileName(fileName: string): { slug: string; n: 1 | 2 } | null {
  let base = fileName.toLowerCase().trim()
  while (EXT.test(base)) base = base.replace(EXT, '')
  base = base
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  let n: 1 | 2 = 1
  if (/-(ende|end|2)$/.test(base)) {
    n = 2
    base = base.replace(/-(ende|end|2)$/, '')
  } else if (/-(start|1)$/.test(base)) base = base.replace(/-(start|1)$/, '')
  return SLUGS.has(base) ? { slug: base, n } : null
}

interface StepLike {
  libraryId?: string | null
  exerciseKey: string
  title: string
}

const BY_LIBRARY: Record<string, string> = {
  'kb-kreuzheben-auch-doppel': 'kreuzheben',
  'swing-hike-pass': 'swing',
  clean: 'clean',
  'einbeiniges-kb-kreuzheben': 'einbeiniges-kreuzheben',
  'goblet-squat-auf-box': 'goblet-squat',
  'doppel-front-squat': 'front-squat',
  'einarmiges-rudern-auch-doppel-ausfallschritt': 'rudern',
  'floor-press-auch-doppel': 'floor-press',
  'druecken-ueber-kopf-halbkniend-stehend': 'ueberkopfdruecken',
  liegestuetz: 'liegestuetz',
  'dead-bug': 'dead-bug',
  seitstuetz: 'seitstuetz',
  'hammer-curl': 'hammer-curl',
  'horn-curl': 'horn-curl',
  'trizepsdruecken-ueber-kopf': 'trizepsdruecken-ueberkopf',
  'trizepsstrecken-liegend': 'trizepsstrecken-liegend',
  'wadenheben-gestrecktes-knie': 'wadenheben-stehend',
  'wadenheben-gebeugtes-knie': 'wadenheben-sitzend',
}

const BY_KNEE: Record<string, string> = {
  'knee:K1': 'clamshell',
  'knee:K2': 'seitliches-gehen',
  'knee:K3': 'hamstring-curl',
  'knee:K4': 'glute-bridge-einbeinig',
  'knee:K5': 'wandsitzen',
  'knee:K6': 'step-down',
  'knee:K7': 'wadenheben-stehend',
  'knee:K8': 'wadenheben-sitzend',
}

/** Photo slots to try for an exercise, most specific first. */
export function imageSlugsFor(step: StepLike): string[] {
  const lib = step.libraryId ?? ''
  if (lib === 'split-squat-reverse-lunge') return /Reverse/i.test(step.title) ? ['reverse-lunge', 'split-squat'] : ['split-squat']
  if (lib === 'farmer-suitcase-carry') return /Suitcase/i.test(step.title) ? ['suitcase-carry', 'farmer-carry'] : ['farmer-carry']
  if (BY_LIBRARY[lib]) return [BY_LIBRARY[lib]]
  if (step.exerciseKey === 'knee:K1' && /Seitstütz/.test(step.title)) return ['seitstuetz', 'clamshell']
  if (BY_KNEE[step.exerciseKey]) return [BY_KNEE[step.exerciseKey]]
  return []
}
