import { useState } from 'react'
import { useConversation } from '../hooks/useConversation'
import HistoryFeed from './HistoryFeed'
import LocationForm from './LocationForm'
import ItemSearch from './ItemSearch'
import OrderItemsPanel from './OrderItemsPanel'
import ReplyBox from './ReplyBox'

export default function ConversationDetail({ orderId, onUnauthorized }) {
  const { order, error, loading, setLocation, addItem, removeItem, sendReply, search } =
    useConversation(orderId, onUnauthorized)
  const [locationPrefill, setLocationPrefill] = useState(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="state">Loading conversation…</div>
  if (error) return <div className="state error">Failed to load: {error}</div>
  if (!order) return null

  async function run(action) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="conv-detail">
      <div className="conv-detail-header">
        <div>
          <div className="conv-detail-title">{order.user?.phoneNumber ?? order.user?.waId}</div>
          {order.location?.name && <div className="conv-detail-location">📍 {order.location.name}</div>}
        </div>
        <span className={`status status-${order.status}`}>{order.status}</span>
      </div>

      <div className="conv-detail-body">
        <div className="conv-detail-history">
          <HistoryFeed
            history={order.history}
            onUseLocation={meta => setLocationPrefill(meta)}
          />
        </div>

        <div className="conv-detail-actions">
          <LocationForm
            key={locationPrefill ? `${locationPrefill.latitude},${locationPrefill.longitude}` : 'none'}
            busy={busy}
            prefill={locationPrefill}
            onSubmit={loc => run(() => setLocation(loc))}
          />
          <ItemSearch
            disabled={busy}
            onSearch={search}
            onAdd={itemId => run(() => addItem(itemId, 1))}
          />
          <OrderItemsPanel
            items={order.items}
            disabled={busy}
            onQuantity={(itemId, qty) => run(() => addItem(itemId, qty))}
            onRemove={itemId => run(() => removeItem(itemId))}
          />
          <ReplyBox onSend={text => sendReply(text)} disabled={busy} />
        </div>
      </div>
    </div>
  )
}
