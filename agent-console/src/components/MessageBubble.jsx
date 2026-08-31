import { messageText } from '../utils'

export default function MessageBubble({ entry, onUseLocation }) {
  const mine = entry.role === 'assistant'
  const isLocation = entry.meta?.type === 'location'

  return (
    <div className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
      <div className="bubble">
        <div className="bubble-text">{messageText(entry)}</div>
        {isLocation && (
          <button
            type="button"
            className="bubble-action"
            onClick={() => onUseLocation(entry.meta)}
          >
            Use this location
          </button>
        )}
      </div>
    </div>
  )
}
