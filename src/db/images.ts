import { parseImageFileName } from '../domain/exerciseImages'
import { db, type ExerciseImage } from './db'

const MAX_SIDE = 900
const QUALITY = 0.85

export interface ProcessedImage {
  type: string
  width: number
  height: number
  data: ArrayBuffer
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  await img.decode()
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
}

/**
 * Re-encodes a photo as a JPEG with at most 900 px on the long side. Drawing it onto a canvas drops all
 * embedded metadata (location, camera, ...), so nothing private travels with the stored image.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const dec = await decode(file)
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(dec.width, dec.height))
    const width = Math.max(1, Math.round(dec.width * scale))
    const height = Math.max(1, Math.round(dec.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas nicht verfügbar')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(dec.source, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', QUALITY))
    if (!blob) throw new Error('Bild konnte nicht umgewandelt werden')
    return { type: 'image/jpeg', width, height, data: await blob.arrayBuffer() }
  } finally {
    dec.close()
  }
}

export async function saveExerciseImage(slug: string, n: 1 | 2, img: ProcessedImage): Promise<void> {
  const row: ExerciseImage = { key: `${slug}:${n}`, slug, n, ...img, updatedAt: new Date().toISOString() }
  await db.exerciseImages.put(row)
}

export const removeExerciseImage = (slug: string, n: 1 | 2) => db.exerciseImages.delete(`${slug}:${n}`)
export const removeExerciseImages = (slug: string) => db.exerciseImages.where('slug').equals(slug).delete()
export const removeAllExerciseImages = () => db.exerciseImages.clear()

export interface ImportResult {
  saved: { file: string; slug: string; n: 1 | 2 }[]
  unmatched: string[]
  failed: string[]
}

/** Imports many files at once and assigns them to exercises by file name. */
export async function importImageFiles(files: File[], process: (f: File) => Promise<ProcessedImage> = processImage): Promise<ImportResult> {
  const result: ImportResult = { saved: [], unmatched: [], failed: [] }
  for (const file of files) {
    const hit = parseImageFileName(file.name)
    if (!hit) {
      result.unmatched.push(file.name)
      continue
    }
    try {
      await saveExerciseImage(hit.slug, hit.n, await process(file))
      result.saved.push({ file: file.name, ...hit })
    } catch {
      result.failed.push(file.name)
    }
  }
  return result
}
