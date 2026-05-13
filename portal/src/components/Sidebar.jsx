const NAV = [
  { id: 'orders', label: 'Orders' },
  { id: 'users', label: 'Users' },
]

export default function Sidebar({ current, onChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Leta</div>
      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${current === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
