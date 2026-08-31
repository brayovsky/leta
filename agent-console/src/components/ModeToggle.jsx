const MODES = [
  { id: 'ai', label: 'AI agent' },
  { id: 'human', label: 'Human' },
]

export default function ModeToggle({ mode, onChange, busy }) {
  return (
    <div className="mode-toggle">
      <span className="mode-toggle-label">Handling conversations:</span>
      <div className="mode-toggle-buttons">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            disabled={busy || mode === m.id}
            onClick={() => onChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
