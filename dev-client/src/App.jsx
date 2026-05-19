import { useState, useRef, useEffect } from 'react'
import './App.css'

const SERVER = 'http://localhost:3000'
const DEV_FROM = '254700000000'

const PRESET_LOCATIONS = [
  { label: 'Westlands (near Naivas)', name: 'Westlands', latitude: -1.2683, longitude: 36.8051 },
  { label: 'Lavington (near Quickmart)', name: 'Lavington', latitude: -1.2853, longitude: 36.7724 },
  { label: 'Two Rivers (near Carrefour)', name: 'Two Rivers', latitude: -1.2150, longitude: 36.8000 },
  { label: 'Pridelands / Tamarind Meadows', name: 'Pridelands', latitude: -1.3820, longitude: 36.9400 },
  { label: 'Signature Mall (Chandarana & Go Fruits)', name: 'Signature Mall', latitude: -1.3766, longitude: 36.9352 },
  { label: 'Karen (out of service)', name: 'Karen', latitude: -1.3185, longitude: 36.7026 },
]

function wrapMessage(message) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'DEV_BUSINESS_ID',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15551781570', phone_number_id: 'DEV_PHONE_NUMBER_ID' },
          contacts: [{ profile: { name: 'Dev User' }, wa_id: DEV_FROM }],
          messages: [message],
        },
      }],
    }],
  }
}

function makeTextPayload(text) {
  return wrapMessage({
    from: DEV_FROM,
    id: `wamid.dev${Date.now()}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'text',
    text: { body: text },
  })
}

function makeLocationPayload({ latitude, longitude, name }) {
  return wrapMessage({
    from: DEV_FROM,
    id: `wamid.dev${Date.now()}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'location',
    location: { latitude, longitude, name },
  })
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  const bottomRef = useRef(null)
  const locWrapRef = useRef(null)

  useEffect(() => {
    const es = new EventSource('/dev/stream')
    es.onmessage = (e) => {
      const { text } = JSON.parse(e.data)
      setMessages(prev => [...prev, { from: 'bot', text }])
      setLoading(false)
    }
    es.onerror = () => {
      setMessages(prev => [...prev, { from: 'bot', text: '⚠️ Lost connection to server.' }])
      setLoading(false)
    }
    return () => es.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!locOpen) return
    function onDocClick(e) {
      if (locWrapRef.current && !locWrapRef.current.contains(e.target)) setLocOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [locOpen])

  async function postPayload(payload, userBubbleText) {
    setMessages(prev => [...prev, { from: 'user', text: userBubbleText }])
    setLoading(true)
    await fetch(`${SERVER}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      setMessages(prev => [...prev, { from: 'bot', text: '⚠️ Could not reach server.' }])
      setLoading(false)
    })
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await postPayload(makeTextPayload(text), text)
  }

  async function sendLocation(loc) {
    if (loading) return
    setLocOpen(false)
    await postPayload(makeLocationPayload(loc), `📍 ${loc.label}`)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="avatar">L</div>
        <div>
          <div className="name">Leta</div>
          <div className="sub">Dev mode · localhost</div>
        </div>
      </header>

      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.from}`}>
            {m.text.split('\n').map((line, j) => (
              <span key={j}>{line}<br /></span>
            ))}
          </div>
        ))}
        {loading && (
          <div className="bubble bot thinking">
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <div className="loc-wrap" ref={locWrapRef}>
          <button
            type="button"
            className="loc-btn"
            onClick={() => setLocOpen(o => !o)}
            disabled={loading}
            aria-label="Share location"
            aria-haspopup="menu"
            aria-expanded={locOpen}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
          </button>
          {locOpen && (
            <div className="loc-popover" role="menu">
              <div className="loc-popover-header">Send a location</div>
              {PRESET_LOCATIONS.map(loc => (
                <button
                  key={loc.label}
                  type="button"
                  className="loc-option"
                  onClick={() => sendLocation(loc)}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          rows={1}
          placeholder="Message"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button onClick={send} disabled={!input.trim() || loading} aria-label="Send">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
