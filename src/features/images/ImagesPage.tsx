import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { importImageFiles, processImage, removeAllExerciseImages, removeExerciseImages, saveExerciseImage, type ImportResult } from '../../db/images'
import { EXERCISE_SLOTS } from '../../domain/exerciseImages'
import { useExerciseImages } from '../../hooks/useExerciseImages'

/** Private photos per exercise. Everything stays on this device; the files are re-encoded and stripped of metadata. */
export function ImagesPage() {
  const navigate = useNavigate()
  const { map, loaded } = useExerciseImages()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult>()
  const [error, setError] = useState('')
  const total = [...map.values()].reduce((n, v) => n + v.length, 0)

  async function onBulk(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      setResult(await importImageFiles(files))
    } catch {
      setError('Der Import ist fehlgeschlagen. Versuche es mit weniger Dateien.')
    } finally {
      setBusy(false)
    }
  }

  async function onOne(slug: string, n: 1 | 2, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await saveExerciseImage(slug, n, await processImage(file))
    } catch {
      setError(`„${file.name}“ konnte nicht gelesen werden. Nutze ein JPG, PNG, WebP oder AVIF.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={() => navigate('/mehr')}>‹ Mehr</button>
      </header>
      <h1>Übungsbilder</h1>
      <p className="muted">Deine Fotos bleiben nur auf diesem Gerät. Sie werden verkleinert und ohne eingebettete Daten (zum Beispiel Standort) gespeichert.</p>

      <div className="stack">
        <section className="card stack">
          <h2>Mehrere Bilder auf einmal</h2>
          <p>
            Wähle Dateien aus, die nach der Übung heißen, zum Beispiel <code>goblet-squat.jpg</code>. Für zwei Bilder: <code>goblet-squat-start.jpg</code> und <code>goblet-squat-ende.jpg</code>.
          </p>
          <label className="btn primary filebtn">
            {busy ? 'Bilder werden verarbeitet …' : 'Bilder auswählen'}
            <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => void onBulk(e)} />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {result && (
            <div role="status" className="stack">
              <p className="done">{result.saved.length} Bilder zugeordnet.</p>
              {result.unmatched.length > 0 && <p className="notice">Nicht zugeordnet (Name passt zu keiner Übung): {result.unmatched.join(', ')}</p>}
              {result.failed.length > 0 && <p className="error">Nicht lesbar: {result.failed.join(', ')}</p>}
            </div>
          )}
        </section>

        <section className="card">
          <div className="sectitle">
            <h2>Alle Übungen</h2>
            <span className="muted" style={{ margin: 0 }}>
              {total} Bilder
            </span>
          </div>
          <ul className="slotlist">
            {EXERCISE_SLOTS.map((s) => {
              const imgs = map.get(s.slug) ?? []
              return (
                <li key={s.slug} className="slot">
                  <div className="slotthumbs">
                    {imgs.length === 0 && <span className="thumb empty" aria-hidden="true" />}
                    {imgs.map((i) => (
                      <img key={i.n} className="thumb" src={i.url} alt={`${s.label}, Bild ${i.n}`} />
                    ))}
                  </div>
                  <div className="slotbody">
                    <strong>{s.label}</strong>
                    <span className="muted block">
                      {s.where} · <code>{s.slug}</code>
                    </span>
                    <div className="slotbtns">
                      {[1, 2].map((n) => (
                        <label key={n} className="btn small filebtn">
                          {imgs.some((i) => i.n === n) ? (n === 1 ? 'Ersetzen' : '2. ersetzen') : n === 1 ? 'Bild wählen' : '2. Bild'}
                          <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => void onOne(s.slug, n as 1 | 2, e)} />
                        </label>
                      ))}
                      {imgs.length > 0 && (
                        <button className="small" onClick={() => void removeExerciseImages(s.slug)}>
                          Entfernen
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {loaded && total > 0 && (
          <button
            className="danger"
            onClick={() => {
              if (window.confirm('Alle Übungsbilder auf diesem Gerät löschen?')) void removeAllExerciseImages()
            }}
          >
            Alle Bilder löschen
          </button>
        )}
      </div>
    </main>
  )
}
