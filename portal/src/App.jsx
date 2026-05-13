import { useCallback, useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import SignIn from './components/SignIn'
import Orders from './pages/Orders'
import Users from './pages/Users'
import { useAuth } from './hooks/useAuth'

const PAGES = {
  orders: { title: 'Orders', Component: Orders },
  users: { title: 'Users', Component: Users },
}

function Portal({ user, onSignOut }) {
  const [page, setPage] = useState('orders')
  const { title, Component } = PAGES[page]
  const handleUnauthorized = useCallback(() => onSignOut(), [onSignOut])

  return (
    <div className="layout">
      <Sidebar current={page} onChange={setPage} />
      <div className="main">
        <TopBar title={title} user={user} onSignOut={onSignOut} />
        <main className="content">
          <Component onUnauthorized={handleUnauthorized} />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) return <div className="signin"><div className="state">Loading…</div></div>
  if (!user) return <SignIn onSignIn={signIn} />
  return <Portal user={user} onSignOut={signOut} />
}
