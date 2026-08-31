// Thin wrapper around the server's checkout endpoints. The order id and token
// arrive in the URL ("?order=<id>&t=<token>") from the WhatsApp "Finish Shopping" link.

export function getParams() {
  const q = new URLSearchParams(window.location.search)
  return { orderId: q.get('order'), token: q.get('t') }
}

async function parse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`)
  return data
}

export async function fetchOrder({ orderId, token }, signal) {
  const res = await fetch(`/checkout/${orderId}?t=${encodeURIComponent(token)}`, { signal })
  return parse(res)
}

export async function placeOrder({ orderId, token }, items) {
  const res = await fetch(`/checkout/${orderId}/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ t: token, items }),
  })
  return parse(res)
}
