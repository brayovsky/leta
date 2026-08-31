import { kes, variantLabel } from '../format'

export default function CartItem({ line, onQuantity, onRemove, disabled }) {
  const variant = variantLabel(line.variant)
  const lineTotal = (line.price ?? 0) * line.quantity

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <div className="cart-item-name">{line.name}</div>
        {variant && <div className="cart-item-meta">{variant}</div>}
        {line.store?.name && <div className="cart-item-store">@ {line.store.name}</div>}
        <button
          type="button"
          className="link-remove"
          onClick={() => onRemove(line.id)}
          disabled={disabled}
        >
          Remove
        </button>
      </div>

      <div className="cart-item-right">
        <div className="stepper">
          <button
            type="button"
            onClick={() => onQuantity(line.id, line.quantity - 1)}
            disabled={disabled || line.quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span>{line.quantity}</span>
          <button
            type="button"
            onClick={() => onQuantity(line.id, line.quantity + 1)}
            disabled={disabled}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <div className="cart-item-price">
          {line.price != null ? kes(lineTotal) : 'Price TBD'}
        </div>
      </div>
    </div>
  )
}
