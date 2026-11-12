import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes, useMatch } from 'react-router-dom'
import { Placeholder } from './components/Placeholder'
import { UpdateBanner } from './components/UpdateBanner'
import { db } from './db/db'
import { initStorage } from './db/startup'
import { SessionPage } from './features/session/SessionPage'
import { SetupDialog } from './features/setup/SetupDialog'
import { TodayPage } from './features/today/TodayPage'

const TABS = [
  { to: '/', label: 'Heute' },
  { to: '/kalender', label: 'Kalender' },
  { to: '/fortschritt', label: 'Fortschritt' },
  { to: '/mehr', label: 'Mehr' },
]

function Shell({ name }: { name: string }) {
  // The tab bar is hidden during a session so the action button sits in the thumb area.
  const inSession = useMatch('/einheit/*') !== null
  return (
    <div className={inSession ? '' : 'shell'}>
      {!inSession && (
        <nav className="tabs" aria-label="Hauptnavigation">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end>
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
      <Routes>
        <Route path="/" element={<TodayPage name={name} />} />
        <Route path="/einheit/:date" element={<SessionPage />} />
        <Route path="/einheit/:date/:kind" element={<SessionPage />} />
        <Route path="/kalender" element={<Placeholder title="Kalender" />} />
        <Route path="/fortschritt" element={<Placeholder title="Fortschritt" />} />
        <Route path="/mehr" element={<Placeholder title="Mehr" />} />
      </Routes>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    void initStorage()
  }, [])
  // undefined = still loading; null = no profile yet
  const profile = useLiveQuery(async () => (await db.profile.get(1)) ?? null)

  if (profile === undefined) return null
  if (profile === null) return <SetupDialog />

  return (
    <HashRouter>
      <UpdateBanner />
      <Shell name={profile.name} />
    </HashRouter>
  )
}
