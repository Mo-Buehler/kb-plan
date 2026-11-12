import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db/db'
import { formatDate } from '../../domain/format'
import { checklistGroups, isOverdue, shoppingGroups, type Group } from '../../domain/lists'
import { todayIso } from '../../domain/plan'

async function toggle(key: string, done: boolean) {
  if (done) await db.checkStates.put({ key, done: true, at: new Date().toISOString() })
  else await db.checkStates.delete(key)
}

function ListView({ title, groups, doneLabel, dueWord }: { title: string; groups: Group[]; doneLabel: string; dueWord: string }) {
  const navigate = useNavigate()
  const states = useLiveQuery(() => db.checkStates.toArray(), [])
  if (!states) return null
  const done = new Set(states.filter((s) => s.done).map((s) => s.key))
  const today = todayIso()

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={() => navigate('/mehr')}>‹ Mehr</button>
      </header>
      <h1>{title}</h1>
      <div className="stack">
        {groups.map((g) => {
          const n = g.entries.filter((e) => done.has(e.id)).length
          return (
            <section key={g.id} className="card">
              <h2>
                {g.title} <span className="muted">· {n}/{g.entries.length}</span>
              </h2>
              <ul className="checklist">
                {g.entries.map((e) => {
                  const isDone = done.has(e.id)
                  const late = isOverdue(e, isDone, today)
                  return (
                    <li key={e.id}>
                      <label className="checkrow">
                        <input type="checkbox" checked={isDone} onChange={(ev) => void toggle(e.id, ev.target.checked)} aria-label={`${e.text} ${doneLabel}`} />
                        <span className={isDone ? 'checked' : ''}>
                          {e.text}
                          {e.detail && <span className="muted block">{e.detail}</span>}
                          {e.due && (
                            <span className={`block ${late ? 'late' : 'muted'}`}>
                              {late ? 'Überfällig seit ' : `${dueWord} `}
                              {formatDate(e.due)}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}

export const ChecklistPage = () => <ListView title="Checklisten" groups={checklistGroups()} doneLabel="erledigt" dueWord="Fällig bis" />
export const ShoppingPage = () => <ListView title="Einkaufsliste" groups={shoppingGroups()} doneLabel="bestellt" dueWord="Bestellen bis" />
