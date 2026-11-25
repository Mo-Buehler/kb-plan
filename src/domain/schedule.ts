import { locate, seed, type SessionItem } from './plan'

export type Tier = 'full' | 'compact' | 'minimum'
export const TIER_LABEL: Record<Tier, string> = { full: 'Voll', compact: 'Kompakt', minimum: 'Minimum' }
export const TIER_ORDER: Tier[] = ['full', 'compact', 'minimum']

export interface Move {
  fromDate: string
  kind: string
  toDate: string
}

export interface ScheduledItem {
  /** Date of the plan entry; also part of the session key, even when the item was moved. */
  originDate: string
  kind: string
  session: SessionItem
  moved: boolean
  /** Set when the week tier (plan section 11) removes this session. */
  hiddenReason?: string
  hint?: string
}

export type TierMap = Record<number, Tier>

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Plan section 11: Kompakt drops the Tuesday knee programme, Minimum also moves Thursday's intervals to Sunday. */
export function tierEffect(tier: Tier, kind: string, dow: string): { hidden?: string; hint?: string } {
  if (tier === 'compact' && dow === 'do' && kind === 'bike') return { hint: 'Kompakt: Donnerstag nur 45 min' }
  if (tier === 'minimum' && dow === 'do' && kind === 'bike')
    return { hidden: 'Minimum: Donnerstag-Intervalle gehen in die Sonntagsfahrt' }
  if (tier === 'minimum' && dow === 'so' && kind === 'bike') return { hint: 'Minimum: Donnerstag-Intervalle in diese Fahrt einbauen' }
  return {}
}

function makeItem(originDate: string, moved: boolean, tiers: TierMap): ScheduledItem | null {
  const pos = locate(originDate)
  if (pos.state !== 'running') return null
  const session = pos.day.session
  const eff = tierEffect(tiers[pos.week.week] ?? 'full', session.kind, pos.day.dow)
  return { originDate, kind: session.kind, session, moved, hiddenReason: eff.hidden, hint: eff.hint }
}

/** All sessions that appear on a calendar date after moves and week tiers. */
export function itemsForDate(date: string, moves: Move[], tiers: TierMap) {
  const items: ScheduledItem[] = []
  const movedAway: (ScheduledItem & { toDate: string })[] = []
  const own = makeItem(date, false, tiers)
  if (own) {
    const mv = moves.find((m) => m.fromDate === date && m.kind === own.kind)
    if (mv) movedAway.push({ ...own, toDate: mv.toDate })
    else items.push(own)
  }
  for (const m of moves.filter((x) => x.toDate === date)) {
    const it = makeItem(m.fromDate, true, tiers)
    if (it && it.kind === m.kind) items.push(it)
  }
  return { items, movedAway }
}

export function isInPlan(date: string): boolean {
  return date >= seed.weeks[0].start && date <= seed.planEnd
}

/** Advisory rules from plan section 11 (never blocking). */
export function moveWarnings(kind: string, fromDate: string, toDate: string, current: Move[], tiers: TierMap): string[] {
  // evaluate the calendar as it would look after the move
  const moves = [...current.filter((m) => !(m.fromDate === fromDate && m.kind === kind)), { fromDate, kind, toDate }]
  const out: string[] = []
  const kinds = (d: string) =>
    itemsForDate(d, moves, tiers)
      .items.filter((i) => !(i.originDate === fromDate && i.kind === kind))
      .map((i) => i.kind)
  if (kind === 'kb-a' || kind === 'kb-b') {
    const near = [addDays(toDate, -1), toDate, addDays(toDate, 1)].flatMap(kinds)
    if (near.some((k) => k === 'kb-a' || k === 'kb-b'))
      out.push('Weniger als 24 Stunden Abstand zur nächsten Kettlebell-Einheit möglich.')
  }
  if (kind === 'kb-a') {
    if ([toDate, addDays(toDate, -1)].flatMap(kinds).includes('football'))
      out.push('Zwischen Fußball und Workout A sollten mindestens 48 Stunden liegen.')
  }
  return out
}
