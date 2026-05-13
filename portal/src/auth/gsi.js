let loadPromise

export function loadGsi() {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id)

    const start = Date.now()
    const tick = () => {
      if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
      if (Date.now() - start > 10000) return reject(new Error('Google Sign-In failed to load'))
      setTimeout(tick, 50)
    }
    tick()
  })

  return loadPromise
}
