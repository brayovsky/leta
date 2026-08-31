import { kes } from '../format'

export default function OrderSummary({ subtotal, deliveryFee, total, empty }) {
  return (
    <div className="summary">
      <div className="summary-row">
        <span>Subtotal</span>
        <span>{kes(subtotal)}</span>
      </div>
      <div className="summary-row">
        <span>Delivery</span>
        <span>{empty ? kes(0) : kes(deliveryFee)}</span>
      </div>
      <div className="summary-row summary-total">
        <span>Total</span>
        <span>{kes(total)}</span>
      </div>
    </div>
  )
}
