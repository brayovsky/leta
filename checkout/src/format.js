export function kes(amount) {
  return `KES ${Number(amount || 0).toLocaleString('en-KE')}`
}

export function variantLabel(variant) {
  if (!variant) return ''
  return [variant.brand, variant.size, variant.unit].filter(Boolean).join(', ')
}
