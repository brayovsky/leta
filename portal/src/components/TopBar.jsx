import UserMenu from './UserMenu'

export default function TopBar({ title, user, onSignOut }) {
  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <UserMenu user={user} onSignOut={onSignOut} />
    </header>
  )
}
