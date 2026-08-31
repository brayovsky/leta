export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// History entries store assistant turns as either a plain string (e.g. a
// human "Delivery set to X." note) or a JSON blob like the LLM agent writes
// ({ items, removedIds, updatedItems, message }). Normalize both to text.
export function messageText(entry) {
  if (entry.role !== 'assistant') return entry.content
  try {
    const parsed = JSON.parse(entry.content)
    if (parsed && typeof parsed === 'object') {
      return parsed.message || '(order updated, no reply text)'
    }
  } catch {
    // not JSON — plain assistant note
  }
  return entry.content
}
