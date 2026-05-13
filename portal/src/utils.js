export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function orderTotal(order) {
  return order.items.reduce((sum, line) => {
    const price = line.item?.price ?? 0
    return sum + price * (line.quantity ?? 1)
  }, 0)
}

export function itemCount(order) {
  return order.items.reduce((sum, line) => sum + (line.quantity ?? 1), 0)
}
