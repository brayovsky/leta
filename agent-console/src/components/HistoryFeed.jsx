import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function HistoryFeed({ history, onUseLocation }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [history?.length])

  if (!history?.length) {
    return <div className="state">No messages yet.</div>
  }

  return (
    <div className="history-feed">
      {history.map((entry, i) => (
        <MessageBubble key={i} entry={entry} onUseLocation={onUseLocation} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
