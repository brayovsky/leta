import { useState } from 'react'
import StatusFilter from '../components/StatusFilter'
import OrderList from '../components/OrderList'
import { useOrders } from '../hooks/useOrders'

export default function Orders({ onUnauthorized }) {
  const [status, setStatus] = useState('active')
  const { orders, error, loading } = useOrders(status, onUnauthorized)

  return (
    <div className="orders-page">
      <div className="orders-toolbar">
        <StatusFilter value={status} onChange={setStatus} />
      </div>
      {loading && <div className="state">Loading…</div>}
      {error && <div className="state error">Failed to load: {error}</div>}
      {!loading && !error && orders.length === 0 && (
        <div className="state">No {status === 'all' ? '' : status} orders.</div>
      )}
      {!loading && !error && orders.length > 0 && <OrderList orders={orders} />}
    </div>
  )
}
