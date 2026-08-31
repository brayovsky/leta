import { useState } from 'react'

// The parent remounts this component (via a `key` derived from `prefill`)
// whenever a new location is picked, so initial state can be derived
// directly from props instead of syncing it in an effect.
export default function LocationForm({ onSubmit, busy, prefill }) {
  const [name, setName] = useState(prefill?.name ?? '')
  const [latitude, setLatitude] = useState(prefill ? String(prefill.latitude ?? '') : '')
  const [longitude, setLongitude] = useState(prefill ? String(prefill.longitude ?? '') : '')
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Latitude/longitude must be numbers')
      return
    }
    try {
      await onSubmit({ name: name.trim() || undefined, latitude: lat, longitude: lng })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="location-form" onSubmit={handleSubmit}>
      <div className="form-title">Set delivery location</div>
      <input
        type="text"
        placeholder="Label (e.g. Home, Sabaki Estate)"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <div className="form-row">
        <input
          type="text"
          placeholder="Latitude"
          value={latitude}
          onChange={e => setLatitude(e.target.value)}
        />
        <input
          type="text"
          placeholder="Longitude"
          value={longitude}
          onChange={e => setLongitude(e.target.value)}
        />
      </div>
      <button type="submit" disabled={busy}>Set location</button>
      {error && <div className="form-error">{error}</div>}
    </form>
  )
}
