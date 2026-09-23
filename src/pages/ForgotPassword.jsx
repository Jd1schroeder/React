import { ArrowLeft, CheckCircle2, ChevronDown, Mail, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import workbenchLogo from '../assets/workbench-logo.png'
import './ForgotPassword.css'

export function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!email) return
    setIsSending(true)
    window.setTimeout(() => { setIsSending(false); setIsSent(true) }, 700)
  }

  return (
    <main className="forgot-page">
      <section className="forgot-card" aria-labelledby="forgot-title">
        <button type="button" className="forgot-logo-button" onClick={() => onNavigate?.('Splash')} aria-label="Go to Workbench home"><img className="forgot-logo" src={workbenchLogo} alt="Workbench CMMS" /></button>
        {isSent ? <div className="forgot-success"><CheckCircle2 size={30} /><h1 id="forgot-title">Check your email</h1><p>If an account exists for <strong>{email}</strong>, we sent instructions to reset your password.</p><Button type="button" ripple onClick={() => onNavigate?.('Login')}>Back to login</Button></div> : <><div className="forgot-icon"><Mail size={28} /></div><div className="forgot-heading"><h1 id="forgot-title">Forgot your password?</h1><p>Enter your work email and weÃ¢â‚¬â„¢ll send you a secure reset link.</p></div><form className="forgot-form" onSubmit={handleSubmit}><label className="login-field"><span>Work email</span><div className="login-input-wrap"><Mail size={18} aria-hidden="true" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your work email" autoComplete="email" required /></div></label><Button type="submit" ripple disabled={isSending} aria-busy={isSending}>{isSending ? 'SendingÃ¢â‚¬Â¦' : 'Send reset link'}</Button></form><button type="button" className="forgot-back" onClick={() => onNavigate?.('Login')}><ArrowLeft size={15} /> Back to login</button></>}
        <p className="forgot-legal">By using Workbench, you agree to the current <button type="button" className="login-link">Terms of Service</button> and <button type="button" className="login-link">Privacy Policy</button>.</p>
        <div className="forgot-footer"><button type="button" className="login-language">English <ChevronDown size={14} /></button><button type="button" className="login-support"><MessageCircle size={16} /> Get support</button></div>
      </section>
    </main>
  )
}
