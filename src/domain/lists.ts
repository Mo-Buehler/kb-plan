import { seed } from './plan'

export interface Entry {
  id: string
  text: string
  /** Due date YYYY-MM-DD, if the plan names one. */
  due?: string
  detail?: string
}

export interface Group {
  id: string
  title: string
  entries: Entry[]
}

const weekStart = (week: number) => seed.weeks.find((w) => w.week === week)?.start

/** Checklists with due dates: group deadline ("bis 06.12.") or the start of the named week. */
export function checklistGroups(): Group[] {
  return seed.checklists.map((g) => ({
    id: g.id,
    title: g.title,
    entries: g.items.map((i) => ({
      id: i.id,
      text: i.text,
      due: ('week' in i && typeof i.week === 'number' ? weekStart(i.week) : undefined) ?? ('dueDate' in g ? g.dueDate : undefined),
    })),
  }))
}

/** Shopping list grouped by priority (Pflicht, Empfohlen, Optional), earliest order date first. */
export function shoppingGroups(): Group[] {
  const order = ['Pflicht', 'Empfohlen', 'Optional']
  const rank = (p: string) => order.findIndex((o) => p.startsWith(o))
  return order
    .map((name) => ({
      id: name,
      title: name,
      entries: seed.shopping
        .filter((s) => rank(s.priority) === order.indexOf(name))
        .sort((a, b) => (a.orderBy ?? '').localeCompare(b.orderBy ?? ''))
        .map((s) => ({
          id: s.id,
          text: `${s.item}${s.quantity !== '1' ? ` (${s.quantity})` : ''}`,
          due: s.orderBy ?? undefined,
          detail: `Gebraucht ab Woche ${s.neededFromWeek}${weekStart(s.neededFromWeek) ? `, ${weekStart(s.neededFromWeek)!.split('-').reverse().slice(0, 2).join('.')}.` : ''}${s.priority.includes('(') ? ` · ${s.priority.slice(s.priority.indexOf('('))}` : ''}${s.orderByNote ? ' · Termin buchen' : ''}`,
        })),
    }))
    .filter((g) => g.entries.length)
}

export const isOverdue = (e: Entry, done: boolean, today: string) => !done && !!e.due && e.due < today

/** Open entries whose due date has passed, across both lists. */
export function overdueCount(done: Set<string>, today: string): number {
  return [...checklistGroups(), ...shoppingGroups()].flatMap((g) => g.entries).filter((e) => isOverdue(e, done.has(e.id), today)).length
}
