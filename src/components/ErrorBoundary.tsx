import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/** Last line of defence: a readable message instead of a blank screen. Stored data is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="page errorscreen" role="alert">
        <h1>Etwas ist schiefgegangen</h1>
        <p>Deine gespeicherten Daten sind nicht betroffen. Lade die App neu. Wenn der Fehler bleibt, sichere deine Daten unter Mehr, Backup.</p>
        <button className="primary" onClick={() => window.location.reload()}>
          Neu laden
        </button>
      </main>
    )
  }
}
