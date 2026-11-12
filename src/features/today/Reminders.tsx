import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { getLastBackup, isBackupDue } from '../../db/backup'
import { db } from '../../db/db'
import { overdueCount } from '../../domain/lists'
import { todayIso } from '../../domain/plan'

/** Quiet notes on "Heute": backup older than 7 days and overdue list entries. */
export function Reminders() {
  const info = useLiveQuery(async () => {
    const [last, profile, checks] = await Promise.all([getLastBackup(), db.profile.get(1), db.checkStates.toArray()])
    return {
      backupDue: isBackupDue(last, profile?.createdAt),
      overdue: overdueCount(new Set(checks.filter((c) => c.done).map((c) => c.key)), todayIso()),
    }
  }, [])
  if (!info || (!info.backupDue && info.overdue === 0)) return null
  return (
    <div className="stack">
      {info.backupDue && (
        <p className="notice">
          Seit 7 Tagen keine Sicherung. <Link to="/mehr/backup">Jetzt sichern</Link>
        </p>
      )}
      {info.overdue > 0 && (
        <p className="notice">
          {info.overdue} überfällige Einträge in den <Link to="/mehr/checklisten">Checklisten</Link> oder der <Link to="/mehr/einkauf">Einkaufsliste</Link>.
        </p>
      )}
    </div>
  )
}
