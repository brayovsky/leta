import { useEffect, useState } from 'react'

export function useOrders(status, onUnauthorized) {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState(null)
  const [loadedStatus, setLoadedStatus] = useState(null)

  useEffect(() => {
    const ac = new AbortController()

    fetch(`/orders?status=${status}`, {
      signal: ac.signal,
      credentials: 'include',
    })
      .then(r => {
        if (r.status === 401 || r.status === 403) {
          onUnauthorized?.()
          throw new Error(r.status === 403 ? 'Not authorized' : 'Session expired')
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setOrders(data)
        setError(null)
        setLoadedStatus(status)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoadedStatus(status)
      })

    return () => ac.abort()
  }, [status, onUnauthorized])

  return { orders, error, loading: loadedStatus !== status }
}
