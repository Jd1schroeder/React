import { ArrowLeft, CheckCircle2, ChevronDown, MailCheck, MessageCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import workbenchLogo from '../assets/workbench-logo.png'
import './VerifyEmail.css'

export function VerifyEmail({ onNavigate }) {
  const [code, setCode] = useState(Array(6).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const inputRefs = useRef([])

  const updateCode = (index, value) => {
    const nextCode = [...code]
    nextCode[index] = value.replace(/\D/g, '').slice(-1)
    setCode(nextCode)
    if (nextCode[index] && index < inputRefs.current.length - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setCode(Array(6).fill('').map((_, index) => pasted[index] ?? ''))
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (code.join('').length !== 6) return
    setIsVerifying(true)
    window.setTimeout(() => { setIsVerifying(false); setIsVerified(true) }, 700)
  }

  return (
    <main className="verify-page">
      <section className="verify-card" aria-labelledby="verify-title">
        <button type="button" className="verify-logo-button" onClick={() => onNavigate?.('Splash')} aria-label="Go to Workbench home"><img className="verify-logo" src={workbenchLogo} alt="Workbench CMMS" /></button>
        <div className="verify-icon"><MailCheck size={30} /></div>
        {isVerified ? <div className="verify-success"><CheckCircle2 size={30} /><h1 id="verify-title">Email verified</h1><p>Your Workbench account is ready. Continue to set up your organization.</p><Button type="button" ripple onClick={() => onNavigate?.('Work Orders')}>Continue to Workbench</Button></div> : <><div className="verify-heading"><h1 id="verify-title">Check your email</h1><p>We sent a 6-digit verification code to your email address.</p></div><form className="verify-form" onSubmit={handleSubmit}><div className="verify-code-fields" role="group" aria-label="Verification code">{code.map((digit, index) => <input key={index} ref={(element) => { inputRefs.current[index] = element }} value={digit} onChange={(event) => updateCode(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} onPaste={handlePaste} inputMode="numeric" maxLength={1} aria-label={`Verification digit ${index + 1}`} autoComplete={index === 0 ? 'one-time-code' : 'off'} />)}</div><Button type="submit" ripple disabled={isVerifying || code.join('').length !== 6} aria-busy={isVerifying}>{isVerifying ? 'Verifying…' : 'Verify email'}</Button></form><p className="verify-resend">Didn’t receive the code? <button type="button" className="login-link">Resend code</button></p><button type="button" className="verify-change-email" onClick={() => onNavigate?.('Signup')}><ArrowLeft size={15} /> Use a different email</button></>}
        <p className="verify-legal">By creating an account, you agree to the current <button type="button" className="login-link">Terms of Service</button> and <button type="button" className="login-link">Privacy Policy</button>.</p>
        <div className="verify-footer"><button type="button" className="login-language">English <ChevronDown size={14} /></button><button type="button" className="login-support"><MessageCircle size={16} /> Get support</button></div>
      </section>
    </main>
  )
}
