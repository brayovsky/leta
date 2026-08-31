export default function OrderItemsPanel({ items, onQuantity, onRemove, disabled }) {
  return (
    <div className="order-items-panel">
      <div className="form-title">Current order</div>
      {items.length === 0 && <div className="empty-items">No items yet.</div>}
      {items.length > 0 && (
        <ul className="items">
          {items.filter(i => i.item).map(line => (
            <li key={line.item._id} className="item editable">
              <input
                type="number"
                min="1"
                className="item-qty-input"
                value={line.quantity}
                disabled={disabled}
                onChange={e => {
                  const q = Number(e.target.value)
                  if (q >= 1) onQuantity(line.item._id, q)
                }}
              />
              <span className="item-name">
                {line.item.name}
                {line.item.variant?.brand && <span className="item-brand"> · {line.item.variant.brand}</span>}
              </span>
              {line.item.price != null && (
                <span className="item-price">{(line.item.price * line.quantity).toFixed(0)}</span>
              )}
              <button
                type="button"
                className="item-remove"
                disabled={disabled}
                onClick={() => onRemove(line.item._id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
