import { useState } from 'react'

export default function ReplyBox({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  async function handleSend() {
    setSending(true)
    setError(null)
    try {
      await onSend(text)
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="reply-box">
      <textarea
        placeholder="Message to customer (optional — order summary + checkout links are always included)…"
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={disabled || sending}
        rows={2}
      />
      <button type="button" onClick={handleSend} disabled={disabled || sending}>
        {sending ? 'Sending…' : 'Send to customer'}
      </button>
      {error && <div className="form-error">{error}</div>}
    </div>
  )
}
