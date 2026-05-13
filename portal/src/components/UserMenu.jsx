import { useEffect, useRef, useState } from 'react'

export default function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase()

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {user.picture
          ? <img src={user.picture} alt="" className="user-avatar" referrerPolicy="no-referrer" />
          : <div className="user-avatar user-avatar-fallback">{initial}</div>}
      </button>

      {open && (
        <div className="user-popover" role="menu">
          <div className="user-popover-header">
            {user.name && <div className="user-popover-name">{user.name}</div>}
            <div className="user-popover-email">{user.email}</div>
          </div>
          <button
            type="button"
            className="user-popover-signout"
            onClick={() => { setOpen(false); onSignOut() }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
