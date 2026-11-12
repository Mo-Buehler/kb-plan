/** True in a normal iPhone/iPad browser tab, false once started from the Home Screen. */
export function isIosBrowserTab(): boolean {
  if (typeof navigator === 'undefined') return false
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
  return ios && !standalone
}

/** The Home Screen app stores its data separately from Safari, so install first, then use. */
export function InstallHint() {
  if (!isIosBrowserTab()) return null
  return (
    <div className="notice" role="note">
      <strong>Erst installieren, dann nutzen.</strong> Du bist gerade im Safari-Tab. Tippe auf Teilen, dann „Zum Home-Bildschirm", und starte die App von dort. Daten aus dem Safari-Tab landen nicht in der installierten App.
    </div>
  )
}
