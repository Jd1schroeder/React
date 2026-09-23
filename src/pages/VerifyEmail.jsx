import { CheckCircle2, ChevronDown, MailCheck, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import workbenchLogo from '../assets/workbench-logo.png'
import './VerifyEmail.css'

export function VerifyEmail({ onNavigate }) {
  const [isVerified, setIsVerified] = useState(false)
  const hasPendingInvite = () => Boolean(window.sessionStorage.getItem('workbench.pendingInviteToken'))

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (isMounted && data.session) setIsVerified(true)
    }

    checkSession()
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted && session && ['INITIAL_SESSION', 'SIGNED_IN'].includes(event)) setIsVerified(true)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <main className="verify-page">
      <section className="verify-card" aria-labelledby="verify-title">
        <button type="button" className="verify-logo-button" onClick={() => onNavigate?.('Splash')} aria-label="Go to Workbench home"><img className="verify-logo" src={workbenchLogo} alt="Workbench CMMS" /></button>
        {isVerified ? (
          <div className="verify-success"><CheckCircle2 size={30} /><h1 id="verify-title">Email verified</h1><p>Your Workbench account is ready. Continue to set up your organization.</p><Button type="button" ripple onClick={() => onNavigate?.(hasPendingInvite() ? 'Accept Invite' : 'Work Orders')}>Continue to Workbench</Button></div>
        ) : (
          <><div className="verify-icon"><MailCheck size={30} /></div><div className="verify-heading"><h1 id="verify-title">Check your email</h1><p>We sent a confirmation link to your email address. Open it to verify your account.</p></div><Button type="button" ripple onClick={() => window.location.reload()}>IÃ¢â‚¬â„¢ve verified my email</Button><p className="verify-resend">Open the link from Supabase in this browser, then return here.</p><button type="button" className="verify-change-email" onClick={() => onNavigate?.('Signup')}>Use a different email</button></>
        )}
        <p className="verify-legal">By creating an account, you agree to the current <button type="button" className="login-link">Terms of Service</button> and <button type="button" className="login-link">Privacy Policy</button>.</p>
        <div className="verify-footer"><button type="button" className="login-language">English <ChevronDown size={14} /></button><button type="button" className="login-support"><MessageCircle size={16} /> Get support</button></div>
      </section>
    </main>
  )
}
