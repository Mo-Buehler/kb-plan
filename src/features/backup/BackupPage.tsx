import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import { useNavigate } from 'react-router-dom'
import { backupFileName, buildBackup, getLastBackup, markBackupDone, parseBackup, restoreBackup, summarize, type BackupFile } from '../../db/backup'
import { seed } from '../../domain/plan'

function download(json: string, name: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Export through the iOS share sheet (e.g. save to iCloud Drive) and import of such a file. */
export function BackupPage() {
  const navigate = useNavigate()
  // Built ahead of the tap: the share sheet must open directly inside the tap handler.
  const [withImages, setWithImages] = useState(true)
  const imageCount = useLiveQuery(() => db.exerciseImages.count(), []) ?? 0
  const prepared = useLiveQuery(async () => {
    const file = await buildBackup({ images: withImages })
    return { json: JSON.stringify(file), name: backupFileName(file.exportedAt), counts: summarize(file) }
  }, [withImages])
  const last = useLiveQuery(async () => (await getLastBackup()) ?? null, [])
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<BackupFile>()
  const [error, setError] = useState('')

  async function share() {
    if (!prepared) return
    const file = new File([prepared.json], prepared.name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'KB Plan Sicherung' })
      else download(prepared.json, prepared.name)
      await markBackupDone()
      setMessage('Sicherung erstellt.')
    } catch (e) {
      // closing the share sheet is not an error
      if ((e as Error).name !== 'AbortError') setMessage('Teilen nicht möglich. Nutze „Als Datei laden".')
    }
  }

  async function pick(file: File | undefined) {
    setError('')
    setPending(undefined)
    if (!file) return
    const result = parseBackup(await file.text())
    if (result.ok) setPending(result.file)
    else setError(result.error)
  }

  async function confirmImport() {
    if (!pending) return
    await restoreBackup(pending)
    setPending(undefined)
    setMessage('Import abgeschlossen. Alle Daten auf diesem Gerät wurden ersetzt.')
  }

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={() => navigate('/mehr')}>‹ Mehr</button>
      </header>
      <h1>Backup und Import</h1>
      <div className="stack">
        <section className="card stack">
          <h2>Sichern</h2>
          <p className="muted">
            Letzte Sicherung: {last ? new Date(last).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'noch keine'}
          </p>
          {imageCount > 0 && (
            <label className="radio">
              <input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} /> Übungsbilder mitsichern ({imageCount}, größere Datei)
            </label>
          )}
          <button className="primary" disabled={!prepared} onClick={() => void share()}>
            Jetzt sichern (Teilen-Menü)
          </button>
          <button disabled={!prepared} onClick={() => prepared && (download(prepared.json, prepared.name), void markBackupDone())}>
            Als Datei laden
          </button>
          <p className="muted">Wähle im Teilen-Menü „In Dateien sichern" und einen iCloud-Drive-Ordner.</p>
          {prepared && prepared.counts.length > 0 && (
            <p className="muted">Enthalten: {prepared.counts.map((c) => `${c.count} ${c.label}`).join(', ')}.</p>
          )}
        </section>

        <section className="card stack">
          <h2>Importieren</h2>
          <p>
            Ersetzt <strong>alle</strong> Daten auf diesem Gerät durch die der Sicherung. So überträgst du Daten zwischen iPhone und iPad.
          </p>
          <label>
            Sicherungsdatei wählen
            <input type="file" accept="application/json,.json" onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {pending && (
            <div className="stack hint card">
              <p>
                Sicherung vom{' '}
                {pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'unbekannt'}:{' '}
                {summarize(pending).map((c) => `${c.count} ${c.label}`).join(', ') || 'keine Einträge'}.
              </p>
              {pending.seedHash && pending.seedHash !== seed.sourceHash && (
                <p className="notice">Die Sicherung gehört zu einer anderen Planversion. Der Import ist trotzdem möglich.</p>
              )}
              <p className="error">Alle aktuellen Daten auf diesem Gerät gehen verloren.</p>
              <button className="primary" onClick={() => void confirmImport()}>
                Ja, Daten ersetzen
              </button>
              <button onClick={() => setPending(undefined)}>Abbrechen</button>
            </div>
          )}
        </section>
        {message && (
          <p role="status" className="done">
            {message}
          </p>
        )}
      </div>
    </main>
  )
}
