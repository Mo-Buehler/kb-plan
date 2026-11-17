import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { InstallHint } from '../../components/InstallHint'
import { adoptNewPlan, getLastBackup, isBackupDue, isNewPlanVersion } from '../../db/backup'
import { db } from '../../db/db'
import { overdueCount } from '../../domain/lists'
import { todayIso } from '../../domain/plan'

/** Quiet notes on "Heute": new plan version, backup older than 7 days and overdue list entries. */
export function Reminders() {
  const info = useLiveQuery(async () => {
    const [last, profile, checks, newPlan] = await Promise.all([getLastBackup(), db.profile.get(1), db.checkStates.toArray(), isNewPlanVersion()])
    return {
      newPlan,
      backupDue: isBackupDue(last, profile?.createdAt),
      overdue: overdueCount(new Set(checks.filter((c) => c.done).map((c) => c.key)), todayIso()),
    }
  }, [])
  return (
    <div className="stack">
      <InstallHint />
      {info?.newPlan && (
        <div className="notice stack">
          <p>
            <strong>Neuer Trainingsplan erkannt.</strong> Deine Ergebnisse und die Haken in den Listen bleiben erhalten. Eigene Plan-Änderungen, Verschiebungen und Wochenstufen gehören zum alten Plan und werden zurückgesetzt.
          </p>
          <button className="primary" onClick={() => void adoptNewPlan()}>
            Neuen Plan übernehmen
          </button>
        </div>
      )}
      {info?.backupDue && (
        <p className="notice">
          Seit 7 Tagen keine Sicherung. <Link to="/mehr/backup">Jetzt sichern</Link>
        </p>
      )}
      {info && info.overdue > 0 && (
        <p className="notice">
          {info.overdue} überfällige Einträge in den <Link to="/mehr/checklisten">Checklisten</Link> oder der <Link to="/mehr/einkauf">Einkaufsliste</Link>.
        </p>
      )}
    </div>
  )
}
