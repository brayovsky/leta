export default function OrderItems({ items }) {
  if (items.length === 0) return <div className="empty-items">No items</div>

  return (
    <ul className="items">
      {items.map((line, i) => (
        <li key={i} className="item">
          <span className="item-qty">{line.quantity}×</span>
          <span className="item-name">
            {line.item?.name ?? 'Unknown item'}
            {line.item?.variant?.brand && <span className="item-brand"> · {line.item.variant.brand}</span>}
            {line.item?.variant?.size && (
              <span className="item-size"> · {line.item.variant.size}{line.item.variant.unit ?? ''}</span>
            )}
          </span>
          {line.item?.price != null && (
            <span className="item-price">{(line.item.price * line.quantity).toFixed(2)}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
