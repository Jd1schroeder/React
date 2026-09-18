import { CheckCircle2, CircleAlert, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { acceptOrganizationInvitation } from '../services/invitationService'
import { supabase } from '../lib/supabase'
import './AcceptInvite.css'

export function AcceptInvite({ onNavigate }) {
  const getToken = () => new URLSearchParams(window.location.search).get('token') || window.sessionStorage.getItem('workbench.pendingInviteToken')
  const [state, setState] = useState(() => getToken() ? { status: 'loading', message: '' } : { status: 'error', message: 'This invitation link is missing its token.' })

  useEffect(() => {
    const token = getToken()
    if (!token) return

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setState({ status: 'signed-out', message: 'Sign in with the invited email address to continue.' })
        return
      }
      try {
        await acceptOrganizationInvitation(token)
        window.sessionStorage.removeItem('workbench.pendingInviteToken')
        setState({ status: 'success', message: 'Your organization access is ready.' })
      } catch (error) {
        setState({ status: 'error', message: error.message || 'This invitation could not be accepted.' })
      }
    })
  }, [])

  const title = state.status === 'success' ? 'Invitation accepted' : state.status === 'signed-out' ? 'Sign in to accept your invitation' : state.status === 'error' ? 'Invitation unavailable' : 'Accepting invitation'
  const Icon = state.status === 'success' ? CheckCircle2 : state.status === 'error' ? CircleAlert : MailCheck

  const preserveToken = () => { const token = getToken(); if (token) window.sessionStorage.setItem('workbench.pendingInviteToken', token) }
  return <main className="accept-invite-page"><section className="accept-invite-card" aria-labelledby="accept-invite-title"><div className={`accept-invite-icon is-${state.status}`}><Icon size={30} /></div><h1 id="accept-invite-title">{title}</h1><p>{state.status === 'loading' ? 'Please wait while we confirm your invitation.' : state.message}</p>{state.status === 'success' && <Button type="button" ripple onClick={() => onNavigate?.('Work Orders')}>Continue to Workbench</Button>}{state.status === 'signed-out' && <div className="accept-invite-actions"><Button type="button" ripple onClick={() => { preserveToken(); onNavigate?.('Login') }}>Log in</Button><button type="button" className="accept-invite-secondary" onClick={() => { preserveToken(); onNavigate?.('Signup') }}>Create account</button></div>}{state.status === 'error' && <Button type="button" ripple onClick={() => onNavigate?.('Splash')}>Go to Workbench</Button>}</section></main>
}
