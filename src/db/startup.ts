import { seed } from '../domain/plan'
import { db } from './db'

/**
 * First start: ask the browser to keep storage persistent and remember which plan
 * version the user data belongs to (needed when a new cycle's seed replaces this one).
 */
export async function initStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // not supported -> ignore silently
  }
  const known = await db.meta.get('seedHash')
  if (!known) await db.meta.put({ key: 'seedHash', value: seed.sourceHash })
}
