import './App.css'
import { useCheckout } from './hooks/useCheckout'
import CartItem from './components/CartItem'
import OrderSummary from './components/OrderSummary'
import { kes } from './format'

function Centered({ icon, title, message }) {
  return (
    <div className="state">
      {icon && <div className="state-icon">{icon}</div>}
      <div className="state-title">{title}</div>
      {message && <div className="state-message">{message}</div>}
    </div>
  )
}

export default function App() {
  const {
    order, lines, status, error, placed,
    subtotal, deliveryFee, total,
    setQuantity, removeItem, place,
  } = useCheckout()

  if (status === 'loading') {
    return <Shell><Centered title="Loading your order…" /></Shell>
  }

  if (status === 'error') {
    return <Shell><Centered icon="⚠️" title="Can't open checkout" message={error} /></Shell>
  }

  if (status === 'done') {
    return (
      <Shell>
        <Centered
          icon="✅"
          title="Order confirmed!"
          message={`Total ${kes(placed.total)}. We've sent a confirmation on WhatsApp and will let you know when it's on the way.`}
        />
      </Shell>
    )
  }

  const busy = status === 'placing'
  const empty = lines.length === 0

  return (
    <Shell>
      {order.location?.name && (
        <section className="card delivery">
          <div className="card-label">Delivering to</div>
          <div className="delivery-name">📍 {order.location.name}</div>
          {order.phoneNumber && <div className="delivery-phone">{order.phoneNumber}</div>}
        </section>
      )}

      <section className="card">
        <div className="card-label">Your items</div>
        {empty ? (
          <div className="empty">Your cart is empty. Add items on WhatsApp to continue.</div>
        ) : (
          <div className="cart-list">
            {lines.map(line => (
              <CartItem
                key={line.id}
                line={line}
                onQuantity={setQuantity}
                onRemove={removeItem}
                disabled={busy}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <OrderSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} empty={empty} />
      </section>

      {error && <div className="error-banner">{error}</div>}

      <button className="place-btn" onClick={place} disabled={busy || empty}>
        {busy ? 'Placing order…' : `Place order · ${kes(total)}`}
      </button>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="page">
      <header className="header">
        <div className="brand">Leta</div>
        <div className="brand-sub">Checkout</div>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
