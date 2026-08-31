import { useCallback, useEffect, useState } from 'react'
import { fetchOrder, getParams, placeOrder } from '../api'

const DELIVERY_FEE_FALLBACK = 200

// Owns the checkout lifecycle: load the order, let the customer adjust
// quantities / remove items locally, and place the final order.
export function useCheckout() {
  const [params] = useState(getParams)
  const valid = Boolean(params.orderId && params.token)
  const [order, setOrder] = useState(null)
  const [lines, setLines] = useState([]) // [{ ...item, quantity }]
  const [status, setStatus] = useState(valid ? 'loading' : 'error') // loading | ready | placing | done | error
  const [error, setError] = useState(valid ? null : 'This checkout link is missing or invalid.')
  const [placed, setPlaced] = useState(null) // { total }

  useEffect(() => {
    if (!valid) return
    const ac = new AbortController()
    fetchOrder(params, ac.signal)
      .then(data => {
        setOrder(data)
        setLines(data.items)
        setStatus('ready')
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setStatus('error')
      })
    return () => ac.abort()
  }, [params, valid])

  const setQuantity = useCallback((id, quantity) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, quantity: Math.max(1, quantity) } : l)))
  }, [])

  const removeItem = useCallback((id) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }, [])

  const deliveryFee = order?.deliveryFee ?? DELIVERY_FEE_FALLBACK
  const subtotal = lines.reduce((sum, l) => sum + (l.price ?? 0) * l.quantity, 0)
  const total = subtotal + (lines.length ? deliveryFee : 0)

  const place = useCallback(async () => {
    if (!lines.length) return
    setStatus('placing')
    setError(null)
    try {
      const result = await placeOrder(params, lines.map(l => ({ itemId: l.id, quantity: l.quantity })))
      setPlaced({ total: result.total })
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('ready')
    }
  }, [lines, params])

  return {
    order,
    lines,
    status,
    error,
    placed,
    subtotal,
    deliveryFee,
    total,
    setQuantity,
    removeItem,
    place,
  }
}
