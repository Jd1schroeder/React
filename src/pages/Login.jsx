import { ChevronDown, Eye, EyeOff, LockKeyhole, Mail, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import workbenchIcon from '../assets/workbench-icon.png'
import workbenchLogo from '../assets/workbench-logo.png'
import './Login.css'

export function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const handleSubmit = (event) => event.preventDefault()

  return (
    <main className="login-page">
      <section className="login-hero" aria-label="Workbench facility operations">
        <div className="login-hero-grid" />
        <div className="login-hero-orb login-hero-orb-one" />
        <div className="login-hero-orb login-hero-orb-two" />
        <div className="login-hero-content">
          <div className="login-brand login-brand-light">
            <img className="login-brand-mark" src={workbenchIcon} alt="" />
            <span>Workbench</span>
          </div>
          <div>
            <p className="login-hero-kicker">FACILITY OPERATIONS</p>
            <h2>Keep every team,<br />tool, and task moving.</h2>
            <p className="login-hero-copy">One clear workspace for the work that keeps your facility running.</p>
          </div>
          <div className="login-hero-illustration" aria-hidden="true">
            <div className="illustration-building"><span /><span /><span /><span /><span /><span /></div>
            <div className="illustration-floor" />
            <div className="illustration-tool illustration-tool-one" />
            <div className="illustration-tool illustration-tool-two" />
          </div>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-inner">
          <div className="login-brand login-brand-panel">
            <img className="login-full-logo" src={workbenchLogo} alt="Workbench CMMS" />
          </div>
          <div className="login-heading">
            <h1 id="login-title">Welcome back</h1>
            <p>Sign in to manage your facility operations.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Email address</span>
              <div className="login-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input type="email" name="email" placeholder="Enter your email" autoComplete="email" />
              </div>
            </label>
            <label className="login-field">
              <span>Password</span>
              <div className="login-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Enter your password" autoComplete="current-password" />
                <button type="button" className="login-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <div className="login-options">
              <label className="login-checkbox">
                <input type="checkbox" name="remember" />
                <span>Remember me</span>
              </label>
              <button type="button" className="login-link">Forgot password?</button>
            </div>
            <Button type="submit">Log in</Button>
          </form>
          <p className="login-signup">
            <span className="login-signup-prompt">Don’t have an account? </span>
            <button type="button" className="login-link">
              <span className="login-signup-desktop">Sign up.</span>
              <span className="login-signup-mobile">Create account</span>
            </button>
          </p>
          <div className="login-panel-footer">
            <button type="button" className="login-language">English <ChevronDown size={14} /></button>
            <button type="button" className="login-support"><MessageCircle size={16} /> Get support</button>
          </div>
        </div>
      </section>
    </main>
  )
}
