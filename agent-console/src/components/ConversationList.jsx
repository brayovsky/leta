import { formatDate, messageText } from '../utils'

export default function ConversationList({ conversations, selectedId, onSelect }) {
  if (conversations.length === 0) {
    return <div className="state">No conversations.</div>
  }

  return (
    <ul className="conv-list">
      {conversations.map(c => (
        <li key={c.id}>
          <button
            type="button"
            className={`conv-row ${selectedId === c.id ? 'active' : ''} ${c.needsReply ? 'needs-reply' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="conv-row-top">
              <span className="conv-user">{c.user?.phoneNumber ?? c.user?.waId ?? 'Unknown'}</span>
              <span className="conv-time">{formatDate(c.updatedAt)}</span>
            </div>
            <div className="conv-row-bottom">
              <span className="conv-preview">
                {c.lastMessage ? messageText(c.lastMessage) : 'No messages yet'}
              </span>
              {c.needsReply && <span className="conv-badge">Needs reply</span>}
            </div>
            {c.location?.name && <div className="conv-location">📍 {c.location.name}</div>}
          </button>
        </li>
      ))}
    </ul>
  )
}
