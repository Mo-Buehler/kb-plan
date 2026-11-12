import { useRegisterSW } from 'virtual:pwa-register/react'

/** Shows "new version" after a deployment. Reloading never touches IndexedDB data. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="banner" role="status">
      Neue Version verfügbar
      <button onClick={() => updateServiceWorker(true)}>Neu laden</button>
    </div>
  )
}
