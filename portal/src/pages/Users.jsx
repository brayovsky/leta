import { useUsers } from '../hooks/useUsers'

export default function Users({ onUnauthorized }) {
  const { users, error, loading } = useUsers(onUnauthorized)

  if (loading) return <div className="state">Loading…</div>
  if (error) return <div className="state error">Failed to load: {error}</div>
  if (users.length === 0) return <div className="state">No users.</div>

  return (
    <div className="users-table-wrap">
      <table className="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>WA ID</th>
            <th>Phone</th>
            <th className="num">Orders</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.email || <span className="muted">—</span>}</td>
              <td className="mono">{u.waId}</td>
              <td>{u.phoneNumber || <span className="muted">—</span>}</td>
              <td className="num">{u.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
