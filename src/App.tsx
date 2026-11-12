import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Placeholder } from './components/Placeholder'
import { UpdateBanner } from './components/UpdateBanner'
import { db } from './db/db'
import { initStorage } from './db/startup'
import { SetupDialog } from './features/setup/SetupDialog'
import { TodayPage } from './features/today/TodayPage'

const TABS = [
  { to: '/', label: 'Heute' },
  { to: '/kalender', label: 'Kalender' },
  { to: '/fortschritt', label: 'Fortschritt' },
  { to: '/mehr', label: 'Mehr' },
]

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
      <div className="shell">
        <nav className="tabs" aria-label="Hauptnavigation">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <Routes>
          <Route path="/" element={<TodayPage name={profile.name} />} />
          <Route path="/kalender" element={<Placeholder title="Kalender" />} />
          <Route path="/fortschritt" element={<Placeholder title="Fortschritt" />} />
          <Route path="/mehr" element={<Placeholder title="Mehr" />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
