import { useState } from 'react'

export default function ItemSearch({ onSearch, onAdd, disabled }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const found = await onSearch(query)
      setResults(Array.isArray(found) ? found : [])
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="item-search">
      <div className="form-title">Search catalog</div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search items (e.g. milk, bread)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || loading}>{loading ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <div className="form-error">{error}</div>}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map(item => (
            <li key={item._id} className="search-result">
              <div className="search-result-info">
                <span className="search-result-name">{item.name}</span>
                {item.variant?.brand && <span className="search-result-meta"> · {item.variant.brand}</span>}
                {item.variant?.size && <span className="search-result-meta"> · {item.variant.size}{item.variant.unit ?? ''}</span>}
                <span className="search-result-store"> · {item.store?.name}</span>
              </div>
              <div className="search-result-price">{item.price != null ? item.price : '—'}</div>
              <button type="button" onClick={() => onAdd(item._id)} disabled={disabled}>Add</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
