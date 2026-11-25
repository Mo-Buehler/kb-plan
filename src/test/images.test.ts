import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, deleteAllData, parseBackup, restoreBackup, summarize } from '../db/backup'
import { db } from '../db/db'
import { importImageFiles, removeAllExerciseImages, removeExerciseImages, saveExerciseImage } from '../db/images'
import { EXERCISE_SLOTS, imageSlugsFor, parseImageFileName } from '../domain/exerciseImages'
import { seed } from '../domain/plan'
import { buildKbSteps, buildKneeSteps } from '../domain/steps'

const fake = (bytes: number[] = [1, 2, 3, 250]) => ({ type: 'image/jpeg', width: 800, height: 600, data: new Uint8Array(bytes).buffer })

beforeEach(async () => {
  await deleteAllData()
})

describe('file names to exercises', () => {
  it('maps plain names, start and end images, umlauts, spaces and double extensions', () => {
    expect(parseImageFileName('goblet-squat.jpg')).toEqual({ slug: 'goblet-squat', n: 1 })
    expect(parseImageFileName('Goblet Squat.JPG')).toEqual({ slug: 'goblet-squat', n: 1 })
    expect(parseImageFileName('goblet-squat-start.jpg')).toEqual({ slug: 'goblet-squat', n: 1 })
    expect(parseImageFileName('goblet-squat-ende.webp')).toEqual({ slug: 'goblet-squat', n: 2 })
    expect(parseImageFileName('horn-curl.jpg.png')).toEqual({ slug: 'horn-curl', n: 1 })
    expect(parseImageFileName('Überkopfdrücken.png')).toEqual({ slug: 'ueberkopfdruecken', n: 1 })
    expect(parseImageFileName('liegestuetz_ende.jpeg')).toEqual({ slug: 'liegestuetz', n: 2 })
    expect(parseImageFileName('unbekannt.jpg')).toBeNull()
    expect(parseImageFileName('IMG_1234.HEIC')).toBeNull()
  })

  it('every name from the hand-over list is recognised', () => {
    for (const s of EXERCISE_SLOTS) expect(parseImageFileName(`${s.slug}.jpg`)?.slug).toBe(s.slug)
  })
})

describe('exercises to photo slots', () => {
  const allSteps = [
    ...[1, 5, 9, 13].flatMap((w) => (['A', 'B'] as const).flatMap((k) => buildKbSteps(w, k))),
    ...(['P1', 'P2', 'P3', 'P4'] as const).flatMap((p) => (['wed', 'sat'] as const).flatMap((d) => buildKneeSteps(p, d))),
  ].filter((s) => s.kind !== 'check')

  it('every exercise of the plan has a photo slot', () => {
    const missing = [...new Set(allSteps.filter((s) => imageSlugsFor(s).length === 0).map((s) => s.title))]
    expect(missing).toEqual([])
  })

  it('every slot is used by some exercise (nothing unreachable in the import list)', () => {
    const used = new Set(allSteps.flatMap((s) => imageSlugsFor(s)))
    for (const s of EXERCISE_SLOTS) expect(used.has(s.slug), s.slug).toBe(true)
  })

  it('every library entry and knee exercise maps to a slot', () => {
    for (const l of seed.library) expect(imageSlugsFor({ libraryId: l.id, exerciseKey: 'x', title: l.name }).length, l.id).toBeGreaterThan(0)
  })

  it('tells variants apart: reverse lunge before split squat, suitcase before farmer', () => {
    expect(imageSlugsFor({ libraryId: 'split-squat-reverse-lunge', exerciseKey: 'main:B2', title: 'Reverse Lunge (Goblet)' })).toEqual(['reverse-lunge', 'split-squat'])
    expect(imageSlugsFor({ libraryId: 'split-squat-reverse-lunge', exerciseKey: 'main:B2', title: 'Split Squat (Goblet)' })).toEqual(['split-squat'])
    expect(imageSlugsFor({ libraryId: 'farmer-suitcase-carry', exerciseKey: 'main:B5', title: 'Suitcase Carry' })).toEqual(['suitcase-carry', 'farmer-carry'])
    expect(imageSlugsFor({ libraryId: null, exerciseKey: 'knee:K1', title: 'Seitstütz mit Abheben des oberen Beins' })).toEqual(['seitstuetz', 'clamshell'])
  })
})

describe('private photo storage', () => {
  it('imports many files at once and reports what it could not assign', async () => {
    const files = [new File(['x'], 'goblet-squat-start.jpg'), new File(['x'], 'goblet-squat-ende.jpg'), new File(['x'], 'Dead Bug.png'), new File(['x'], 'urlaub.jpg'), new File(['x'], 'wandsitzen.jpg')]
    const result = await importImageFiles(files, async (f) => {
      if (f.name === 'wandsitzen.jpg') throw new Error('unreadable')
      return fake()
    })
    expect(result.saved.map((s) => `${s.slug}:${s.n}`)).toEqual(['goblet-squat:1', 'goblet-squat:2', 'dead-bug:1'])
    expect(result.unmatched).toEqual(['urlaub.jpg'])
    expect(result.failed).toEqual(['wandsitzen.jpg'])
    expect(await db.exerciseImages.count()).toBe(3)
  })

  it('replaces an image of the same slot and removes by exercise', async () => {
    await saveExerciseImage('clean', 1, fake([1]))
    await saveExerciseImage('clean', 1, fake([2, 2]))
    await saveExerciseImage('clean', 2, fake([3]))
    expect(await db.exerciseImages.count()).toBe(2)
    expect(new Uint8Array((await db.exerciseImages.get('clean:1'))!.data)).toEqual(new Uint8Array([2, 2]))
    await removeExerciseImages('clean')
    expect(await db.exerciseImages.count()).toBe(0)
    await saveExerciseImage('swing', 1, fake())
    await removeAllExerciseImages()
    expect(await db.exerciseImages.count()).toBe(0)
  })
})

describe('backup with photos', () => {
  it('photos survive export and import byte for byte', async () => {
    await saveExerciseImage('swing', 1, fake([0, 255, 128, 7]))
    await saveExerciseImage('swing', 2, fake([9, 9, 9]))
    const text = JSON.stringify(await buildBackup())
    await deleteAllData()
    expect(await db.exerciseImages.count()).toBe(0)
    const parsed = parseBackup(text)
    if (!parsed.ok) throw new Error(parsed.error)
    expect(summarize(parsed.file)).toContainEqual({ label: 'Übungsbilder', count: 2 })
    await restoreBackup(parsed.file)
    const rows = await db.exerciseImages.orderBy('key').toArray()
    expect(rows.map((r) => r.key)).toEqual(['swing:1', 'swing:2'])
    expect(new Uint8Array(rows[0].data)).toEqual(new Uint8Array([0, 255, 128, 7]))
  })

  it('a backup without photos leaves the photos on this device alone', async () => {
    await saveExerciseImage('swing', 1, fake())
    const withoutImages = JSON.stringify(await buildBackup({ images: false }))
    const parsed = parseBackup(withoutImages)
    if (!parsed.ok) throw new Error(parsed.error)
    await restoreBackup(parsed.file)
    expect(await db.exerciseImages.count()).toBe(1)
  })

  it('older backup files without the photo table still import', () => {
    const r = parseBackup('{"app":"kb-plan","format":1,"tables":{"measurements":[]}}')
    expect(r.ok).toBe(true)
  })

  it('"delete all data" also removes the photos', async () => {
    await saveExerciseImage('swing', 1, fake())
    await deleteAllData()
    expect(await db.exerciseImages.count()).toBe(0)
  })
})
