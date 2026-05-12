import { useState, useRef, useEffect } from 'react'
import './App.css'

const SERVER = 'http://localhost:3000'
const DEV_FROM = '254700000000'

function makePayload(text) {
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
          messages: [{
            from: DEV_FROM,
            id: `wamid.dev${Date.now()}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: text },
          }],
        },
      }],
    }],
  }
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

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

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { from: 'user', text }])
    setLoading(true)

    await fetch(`${SERVER}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makePayload(text)),
    }).catch(() => {
      setMessages(prev => [...prev, { from: 'bot', text: '⚠️ Could not reach server.' }])
      setLoading(false)
    })
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
