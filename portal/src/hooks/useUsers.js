import { useEffect, useState } from 'react'

export function useUsers(onUnauthorized) {
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()

    fetch('/users', { signal: ac.signal, credentials: 'include' })
      .then(r => {
        if (r.status === 401 || r.status === 403) {
          onUnauthorized?.()
          throw new Error(r.status === 403 ? 'Not authorized' : 'Session expired')
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setUsers(data)
        setError(null)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message)
      })
      .finally(() => setLoading(false))

    return () => ac.abort()
  }, [onUnauthorized])

  return { users, error, loading }
}
