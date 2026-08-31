import { useEffect, useRef, useState } from 'react'

const POLL_MS = 4000

export function useConversations(status, onUnauthorized) {
  const [conversations, setConversations] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const r = await fetch(`/console/conversations?status=${status}`, { credentials: 'include' })
        if (r.status === 401 || r.status === 403) {
          onUnauthorized?.()
          throw new Error('Session expired')
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        if (cancelled) return
        setConversations(data)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    timerRef.current = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timerRef.current)
    }
  }, [status, onUnauthorized])

  return { conversations, error, loading }
}
