const OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'all', label: 'All' },
]

export default function StatusFilter({ value, onChange }) {
  return (
    <label className="status-filter">
      <span className="status-filter-label">Status</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
