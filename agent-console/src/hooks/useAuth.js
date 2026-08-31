import { useCallback, useEffect, useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()

    fetch('/auth/agent/me', { credentials: 'include', signal: ac.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => setUser(data?.user ?? null))
      .catch(err => { if (err.name !== 'AbortError') setUser(null) })
      .finally(() => setLoading(false))

    return () => ac.abort()
  }, [])

  const signIn = useCallback(async credential => {
    const r = await fetch('/auth/agent/google', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    })
    if (!r.ok) {
      const { error } = await r.json().catch(() => ({}))
      throw new Error(error || `Sign-in failed (${r.status})`)
    }
    const { user } = await r.json()
    setUser(user)
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/auth/signout', { method: 'POST', credentials: 'include' })
      .catch(() => {})
    setUser(null)
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect()
    }
  }, [])

  return { user, loading, signIn, signOut }
}
