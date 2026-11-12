/** Key of a session in storage: plan date plus session kind, e.g. "2026-12-09:kb-a". */
export const makeSessionKey = (date: string, kind: string) => `${date}:${kind}`

export function parseSessionKey(key: string): { date: string; kind: string } {
  const [date, kind] = key.split(':')
  return { date, kind }
}
