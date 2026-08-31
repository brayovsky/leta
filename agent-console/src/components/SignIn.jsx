import { useCallback, useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '../auth/config'
import { loadGsi } from '../auth/gsi'

export default function SignIn({ onSignIn }) {
  const buttonRef = useRef(null)
  const [error, setError] = useState(null)

  const handleCredential = useCallback(response => {
    setError(null)
    onSignIn(response.credential).catch(err => setError(err.message))
  }, [onSignIn])

  useEffect(() => {
    let cancelled = false

    loadGsi()
      .then(gsi => {
        if (cancelled || !buttonRef.current) return
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
        })
        gsi.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
        })
        gsi.prompt()
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })

    return () => { cancelled = true }
  }, [handleCredential])

  return (
    <div className="signin">
      <div className="signin-card">
        <h1>Agent console</h1>
        <p className="signin-sub">Sign in with Google to handle conversations</p>
        <div ref={buttonRef} className="signin-button" />
        {error && <p className="signin-error">{error}</p>}
      </div>
    </div>
  )
}
