import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthPage } from './AuthPage'
import { getPostAuthenticationPage } from './auth/authNavigation'

export function Login({ onNavigate }) {
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let isActive = true

    const redirectIfAuthenticated = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!isActive) return

        if (!error && data.session) {
          onNavigate?.(getPostAuthenticationPage())
          return
        }

        setIsCheckingSession(false)
      } catch {
        if (isActive) setIsCheckingSession(false)
      }
    }

    redirectIfAuthenticated()

    return () => {
      isActive = false
    }
  }, [onNavigate])

  if (isCheckingSession) {
    return <div className="workspace-loading" aria-busy="true" aria-label="Checking sign-in status" />
  }

  return <AuthPage mode="login" onNavigate={onNavigate} />
}
