import { CheckCircle2, CircleAlert, LockKeyhole, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { acceptOrganizationInvitation, acceptProvisionedOrganizationInvitation } from '../services/invitationService'
import { supabase } from '../lib/supabase'
import './AcceptInvite.css'

export function AcceptInvite({ onNavigate }) {
  const getToken = () => new URLSearchParams(window.location.search).get('token') || window.sessionStorage.getItem('workbench.pendingInviteToken')
  const [state, setState] = useState({ status: 'loading', message: '' })
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    const token = getToken()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setState(token ? { status: 'signed-out', message: 'Sign in with the invited email address to continue.' } : { status: 'error', message: 'This invitation link is missing its token.' })
        return
      }
      try {
        if (token) {
          await acceptOrganizationInvitation(token)
          window.sessionStorage.removeItem('workbench.pendingInviteToken')
          setState({ status: 'success', message: 'Your organization access is ready.' })
          return
        }
        await acceptProvisionedOrganizationInvitation()
        window.sessionStorage.removeItem('workbench.pendingInviteToken')
        setState({ status: 'password-required', message: 'Confirm your email and set a password to finish joining the organization.' })
      } catch (error) {
        setState({ status: 'error', message: error.message || 'This invitation could not be accepted.' })
      }
    })
  }, [])

  const savePassword = async (event) => {
    event.preventDefault()
    if (password.length < 8) return setState({ status: 'password-required', message: 'Use at least 8 characters for your password.' })
    if (password !== passwordConfirmation) return setState({ status: 'password-required', message: 'Passwords do not match.' })
    setIsSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setState({ status: 'success', message: 'Your organization access is ready.' })
    } catch (error) {
      setState({ status: 'password-required', message: error.message || 'Unable to set your password.' })
    } finally {
      setIsSavingPassword(false)
    }
  }

  const title = state.status === 'success' ? 'Invitation accepted' : state.status === 'password-required' ? 'Set your password' : state.status === 'signed-out' ? 'Sign in to accept your invitation' : state.status === 'error' ? 'Invitation unavailable' : 'Accepting invitation'
  const Icon = state.status === 'success' ? CheckCircle2 : state.status === 'error' ? CircleAlert : MailCheck

  const preserveToken = () => { const token = getToken(); if (token) window.sessionStorage.setItem('workbench.pendingInviteToken', token) }
  return <main className="accept-invite-page"><section className="accept-invite-card" aria-labelledby="accept-invite-title"><div className={`accept-invite-icon is-${state.status}`}><Icon size={30} /></div><h1 id="accept-invite-title">{title}</h1><p>{state.status === 'loading' ? 'Please wait while we confirm your invitation.' : state.message}</p>{state.status === 'password-required' && <form className="accept-invite-password-form" onSubmit={savePassword}><label><span>Password</span><div className="accept-invite-password-input"><LockKeyhole size={17} aria-hidden="true" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></div></label><label><span>Confirm password</span><div className="accept-invite-password-input"><LockKeyhole size={17} aria-hidden="true" /><input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" /></div></label><Button type="submit" ripple disabled={isSavingPassword}>{isSavingPassword ? 'Saving password...' : 'Finish setup'}</Button></form>}{state.status === 'success' && <Button type="button" ripple onClick={() => onNavigate?.('Work Orders')}>Continue to Workbench</Button>}{state.status === 'signed-out' && <div className="accept-invite-actions"><Button type="button" ripple onClick={() => { preserveToken(); onNavigate?.('Login') }}>Log in</Button><button type="button" className="accept-invite-secondary" onClick={() => { preserveToken(); onNavigate?.('Signup') }}>Create account</button></div>}{state.status === 'error' && <Button type="button" ripple onClick={() => onNavigate?.('Splash')}>Go to Workbench</Button>}</section></main>
}
