import { useCallback, useEffect, useState } from 'react'
import './App.css'
import SignIn from './components/SignIn'
import ModeToggle from './components/ModeToggle'
import ConversationList from './components/ConversationList'
import ConversationDetail from './components/ConversationDetail'
import { useAuth } from './hooks/useAuth'
import { useConversations } from './hooks/useConversations'

function Console({ onSignOut }) {
  const [mode, setMode] = useState(null)
  const [modeBusy, setModeBusy] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const handleUnauthorized = useCallback(() => onSignOut(), [onSignOut])
  const { conversations, error, loading } = useConversations('active', handleUnauthorized)

  useEffect(() => {
    fetch('/console/mode', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setMode(data.mode))
      .catch(() => setMode('ai'))
  }, [])

  async function changeMode(next) {
    setModeBusy(true)
    try {
      const r = await fetch('/console/mode', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next }),
      })
      const data = await r.json()
      setMode(data.mode)
    } finally {
      setModeBusy(false)
    }
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-title">Leta agent console</div>
        {mode && <ModeToggle mode={mode} onChange={changeMode} busy={modeBusy} />}
        <button type="button" className="signout-btn" onClick={onSignOut}>Sign out</button>
      </header>

      <div className="body">
        <aside className="conv-list-pane">
          {loading && <div className="state">Loading…</div>}
          {error && <div className="state error">Failed to load: {error}</div>}
          {!loading && !error && (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </aside>

        <main className="conv-detail-pane">
          {selectedId
            ? <ConversationDetail key={selectedId} orderId={selectedId} onUnauthorized={handleUnauthorized} />
            : <div className="state">Select a conversation to get started.</div>}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) return <div className="signin"><div className="state">Loading…</div></div>
  if (!user) return <SignIn onSignIn={signIn} />
  return <Console onSignOut={signOut} />
}
