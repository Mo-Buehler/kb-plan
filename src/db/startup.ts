import { seed } from '../domain/plan'
import { getMeta, setMeta } from './sessions'

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
  const known = await getMeta<string>('seedHash')
  if (!known) await setMeta('seedHash', seed.sourceHash)
}
