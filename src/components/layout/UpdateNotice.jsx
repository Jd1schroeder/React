import { useEffect, useState } from 'react'

const VERSION_CHECK_INTERVAL = 60_000

async function getDeploymentVersion() {
  const response = await fetch(`/version.json?ts=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Deployment version unavailable')
  const data = await response.json()
  return data.version
}

export function UpdateNotice() {
  const [currentVersion, setCurrentVersion] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    let active = true

    const checkForUpdate = async () => {
      try {
        const nextVersion = await getDeploymentVersion()
        if (!active || !nextVersion) return
        if (currentVersion === null) {
          setCurrentVersion(nextVersion)
        } else if (nextVersion !== currentVersion) {
          setUpdateAvailable(true)
        }
      } catch {
        // Version checks are advisory and should never interrupt the app.
      }
    }

    checkForUpdate()
    const intervalId = window.setInterval(checkForUpdate, VERSION_CHECK_INTERVAL)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentVersion])

  if (!updateAvailable) return null

  return (
    <div className="app-update-notice" role="status" aria-live="polite">
      <span>A new version of Workbench is available.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Refresh
      </button>
    </div>
  )
}
