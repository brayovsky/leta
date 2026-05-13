import { useState } from 'react'
import { formatDate, itemCount, orderTotal } from '../utils'
import OrderItems from './OrderItems'

export default function OrderRow({ order }) {
  const [open, setOpen] = useState(false)
  const count = itemCount(order)

  return (
    <li className={`order ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="order-row"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={`chevron ${open ? 'open' : ''}`} aria-hidden>›</span>
        <span className="order-id">#{order._id.slice(-6)}</span>
        <span className="order-user">{order.user?.phoneNumber ?? order.user?.waId ?? 'Unknown'}</span>
        <span className="order-count">{count} {count === 1 ? 'item' : 'items'}</span>
        <span className="order-total-inline">{orderTotal(order).toFixed(2)}</span>
        <span className={`status status-${order.status}`}>{order.status}</span>
        <span className="order-date">{formatDate(order.updatedAt)}</span>
      </button>

      {open && (
        <div className="order-details">
          <OrderItems items={order.items} />
        </div>
      )}
    </li>
  )
}
