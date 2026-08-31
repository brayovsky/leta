import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_MS = 3000

async function parse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export function useConversation(orderId, onUnauthorized) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!orderId) return
    try {
      const r = await fetch(`/console/conversations/${orderId}`, { credentials: 'include' })
      if (r.status === 401 || r.status === 403) {
        onUnauthorized?.()
        throw new Error('Session expired')
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setOrder(await r.json())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [orderId, onUnauthorized])

  useEffect(() => {
    const immediate = setTimeout(refresh, 0)
    timerRef.current = setInterval(refresh, POLL_MS)
    return () => {
      clearTimeout(immediate)
      clearInterval(timerRef.current)
    }
  }, [refresh])

  const setLocation = useCallback(async ({ name, latitude, longitude }) => {
    await parse(await fetch(`/console/conversations/${orderId}/location`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, latitude, longitude }),
    }))
    await refresh()
  }, [orderId, refresh])

  const addItem = useCallback(async (itemId, quantity = 1) => {
    await parse(await fetch(`/console/conversations/${orderId}/items`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity }),
    }))
    await refresh()
  }, [orderId, refresh])

  const removeItem = useCallback(async itemId => {
    await parse(await fetch(`/console/conversations/${orderId}/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    }))
    await refresh()
  }, [orderId, refresh])

  const sendReply = useCallback(async text => {
    await parse(await fetch(`/console/conversations/${orderId}/send`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }))
    await refresh()
  }, [orderId, refresh])

  const search = useCallback(async q => {
    const r = await fetch(`/console/search?orderId=${orderId}&q=${encodeURIComponent(q)}`, { credentials: 'include' })
    return parse(r)
  }, [orderId])

  return { order, error, loading, refresh, setLocation, addItem, removeItem, sendReply, search }
}
