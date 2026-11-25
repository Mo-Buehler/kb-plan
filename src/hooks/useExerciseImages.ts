import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { db } from '../db/db'

export interface ImageRef {
  n: 1 | 2
  url: string
}

/**
 * The private photos of this device as object URLs, grouped by exercise slot.
 * URLs are released again when the data changes or the component goes away.
 */
export function useExerciseImages() {
  const rows = useLiveQuery(() => db.exerciseImages.toArray(), [])
  const [map, setMap] = useState<Map<string, ImageRef[]>>(new Map())

  useEffect(() => {
    if (!rows) return
    const urls: string[] = []
    const next = new Map<string, ImageRef[]>()
    for (const r of [...rows].sort((a, b) => a.n - b.n)) {
      const url = URL.createObjectURL(new Blob([r.data], { type: r.type }))
      urls.push(url)
      next.set(r.slug, [...(next.get(r.slug) ?? []), { n: r.n, url }])
    }
    setMap(next)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [rows])

  /** Photos for the first slug in the list that has any. */
  const forSlugs = useCallback(
    (slugs: string[]): ImageRef[] => {
      for (const s of slugs) {
        const hit = map.get(s)
        if (hit?.length) return hit
      }
      return []
    },
    [map],
  )

  return { map, forSlugs, loaded: rows !== undefined }
}
