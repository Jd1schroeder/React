import { CheckCircle2, ChevronDown, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, MessageCircle, Phone, UserRound, UsersRound, X } from 'lucide-react'
import { AsYouType } from 'libphonenumber-js'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { signInWithPassword, signUpWithOrganization } from '../services/authService'
import workbenchIcon from '../assets/workbench-icon.png'
import workbenchLogo from '../assets/workbench-logo.png'
import flagAustralia from '../assets/flags/au.svg'
import flagCanada from '../assets/flags/ca.svg'
import flagUnitedKingdom from '../assets/flags/gb.svg'
import flagUnitedStates from '../assets/flags/us.svg'
import './Login.css'

function Brand({ onNavigate }) {
  return <button type="button" className="login-brand login-brand-light" onClick={() => onNavigate?.('Splash')} aria-label="Go to Workbench home"><img className="login-brand-mark" src={workbenchIcon} alt="" /><span>Workbench</span></button>
}

function TeamSizeDropdown() {
  const options = ['1–10 people', '11–50 people', '51–200 people', '201+ people']
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState('')

  return (
    <div className="signup-select-wrap">
      <button type="button" className={`signup-select-button ${value ? 'has-value' : ''}`} aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <span>{value || 'Select your team size'}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="signup-select-menu" role="listbox" aria-label="Team size options">
          {options.map((option) => (
            <button key={option} type="button" role="option" aria-selected={value === option} className={value === option ? 'selected' : ''} onClick={() => { setValue(option); setIsOpen(false) }}>
              {option}
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name="teamSize" value={value} />
    </div>
  )
}

const phoneCountryOptions = [
    { code: 'US', dialCode: '+1', flag: flagUnitedStates, label: 'United States', maxDigits: 10 },
    { code: 'CA', dialCode: '+1', flag: flagCanada, label: 'Canada', maxDigits: 10 },
    { code: 'GB', dialCode: '+44', flag: flagUnitedKingdom, label: 'United Kingdom', maxDigits: 11 },
    { code: 'AU', dialCode: '+61', flag: flagAustralia, label: 'Australia', maxDigits: 10 },
]

function PhoneCountryDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handleOutsidePointer = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [isOpen])

  return (
    <div ref={dropdownRef} className="signup-country-wrap">
      <button type="button" className="signup-country-button" aria-label="Phone country code" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <img src={value.flag} alt="" />
        <span>{value.dialCode}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="signup-country-menu" role="listbox" aria-label="Phone country codes">
          {phoneCountryOptions.map((option) => (
            <button key={option.code} type="button" role="option" aria-selected={value.code === option.code} onClick={() => { onChange(option); setIsOpen(false) }}>
              <img src={option.flag} alt="" />
              <span>{option.label}</span>
              <strong>{option.dialCode}</strong>
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name="phoneCountry" value={value.code} />
    </div>
  )
}

function PhoneField() {
  const [country, setCountry] = useState(phoneCountryOptions[0])
  const [phone, setPhone] = useState('')

  const handleCountryChange = (nextCountry) => {
    setCountry(nextCountry)
    setPhone(new AsYouType(nextCountry.code).input(phone.replace(/\D/g, '').slice(0, nextCountry.maxDigits)))
  }

  const handlePhoneChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, country.maxDigits)
    setPhone(new AsYouType(country.code).input(digits))
  }

  return (
    <div className="login-input-wrap signup-phone-wrap">
      <PhoneCountryDropdown value={country} onChange={handleCountryChange} />
      <Phone size={18} aria-hidden="true" />
      <input type="tel" name="phone" value={phone} onChange={handlePhoneChange} inputMode="tel" placeholder="Enter your mobile number" autoComplete="tel" />
      {phone && <button type="button" className="signup-phone-clear" onClick={() => setPhone('')} aria-label="Clear mobile number"><X size={16} /></button>}
    </div>
  )
}

export function AuthPage({ mode = 'login', onNavigate }) {
  const isSignup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const hasPendingInvite = () => Boolean(window.sessionStorage.getItem('workbench.pendingInviteToken'))
  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setIsSubmitting(true)
    if (!isSignup) {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries())
      signInWithPassword({ email: values.email, password: values.password })
        .then(() => onNavigate?.(hasPendingInvite() ? 'Accept Invite' : 'Work Orders'))
        .catch((error) => setSubmitError(error.message || 'We could not sign you in. Please try again.'))
        .finally(() => setIsSubmitting(false))
      return
    }

    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    if (!values.organization?.trim()) {
      setSubmitError('Enter your organization name.')
      setIsSubmitting(false)
      return
    }
    if (values.password !== values.passwordConfirmation) {
      setSubmitError('Passwords do not match.')
      setIsSubmitting(false)
      return
    }

    try {
      const data = await signUpWithOrganization({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        phoneCountry: values.phoneCountry,
        organizationName: values.organization,
        teamSize: values.teamSize,
      })
      onNavigate?.(data.session ? (hasPendingInvite() ? 'Accept Invite' : 'Work Orders') : 'Verify Email')
    } catch (error) {
      setSubmitError(error.message || 'We could not create your account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSignup) {
    return (
      <main className="signup-page">
        <section className="signup-promo" aria-label="Workbench workspace benefits">
          <Brand onNavigate={onNavigate} />
          <div className="signup-promo-copy">
            <p className="login-hero-kicker">FACILITY MANAGEMENT</p>
            <h1>Start managing your facility with Workbench.</h1>
            <p>Bring your assets, work orders, and maintenance team together in one clear workspace.</p>
            <ul className="signup-benefits">
              <li><CheckCircle2 size={20} /> Centralize your facility operations</li>
              <li><UsersRound size={20} /> Invite your full team</li>
              <li><CheckCircle2 size={20} /> Get started with no credit card</li>
            </ul>
          </div>
        </section>
        <section className="signup-panel" aria-labelledby="auth-title">
          <div className="signup-card">
            <button type="button" className="signup-card-logo-button" onClick={() => onNavigate?.('Splash')} aria-label="Go to Workbench home"><img className="signup-card-logo" src={workbenchLogo} alt="Workbench CMMS" /></button>
            <div className="signup-heading"><h1 id="auth-title">Create your account</h1><p>Set up your workspace in a few minutes.</p></div>
            <form className="login-form signup-form" onSubmit={handleSubmit}>
              <div className="signup-name-fields">
                <label className="login-field"><span>First name</span><div className="login-input-wrap"><UserRound size={18} aria-hidden="true" /><input type="text" name="firstName" placeholder="First name" autoComplete="given-name" /></div></label>
                <label className="login-field"><span>Last name</span><div className="login-input-wrap"><UserRound size={18} aria-hidden="true" /><input type="text" name="lastName" placeholder="Last name" autoComplete="family-name" /></div></label>
              </div>
              <label className="login-field"><span>Mobile number <em>(optional)</em></span><PhoneField /></label>
              <label className="login-field"><span>Work email</span><div className="login-input-wrap"><Mail size={18} aria-hidden="true" /><input type="email" name="email" placeholder="Enter your work email" autoComplete="email" /></div></label>
              <label className="login-field"><span>Organization name</span><div className="login-input-wrap"><input type="text" name="organization" placeholder="Enter your organization name" autoComplete="organization" /></div></label>
              <label className="login-field"><span>Team size</span><TeamSizeDropdown /></label>
              <label className="login-field"><span>Password</span><div className="login-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input type={showPassword ? 'text' : 'password'} name="password" placeholder="Create a password" autoComplete="new-password" /><button type="button" className="login-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
              <label className="login-field"><span>Confirm password</span><div className="login-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input type={showConfirmation ? 'text' : 'password'} name="passwordConfirmation" placeholder="Re-enter your password" autoComplete="new-password" /><button type="button" className="login-password-toggle" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? 'Hide password confirmation' : 'Show password confirmation'}>{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
              {submitError && <p className="auth-form-error" role="alert">{submitError}</p>}
              <Button type="submit" ripple disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting && <LoaderCircle className="auth-loading-spinner" size={17} aria-hidden="true" />}{isSubmitting ? 'Creating account…' : 'Create account'}</Button>
            </form>
            <p className="login-signup">Already have an account? <button type="button" className="login-link" onClick={() => onNavigate?.('Login')}>Log in</button></p>
            <p className="login-legal">By creating an account, you agree to the current <button type="button" className="login-link">Terms of Service</button> and <button type="button" className="login-link">Privacy Policy</button>.</p>
            <div className="login-panel-footer"><button type="button" className="login-language">English <ChevronDown size={14} /></button><button type="button" className="login-support"><MessageCircle size={16} /> Get support</button></div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="login-page">
      {submitError && <p className="auth-form-error login-page-error" role="alert">{submitError}</p>}
      <section className="login-hero" aria-label="Workbench facility operations">
        <div className="login-hero-grid" /><div className="login-hero-orb login-hero-orb-one" /><div className="login-hero-orb login-hero-orb-two" />
        <div className="login-hero-content"><Brand onNavigate={onNavigate} /><div><p className="login-hero-kicker">FACILITY OPERATIONS</p><h2>Keep every team,<br />tool, and task moving.</h2><p className="login-hero-copy">One clear workspace for the work that keeps your facility running.</p></div><div className="login-hero-illustration" aria-hidden="true"><div className="illustration-building"><span /><span /><span /><span /><span /><span /></div><div className="illustration-floor" /><div className="illustration-tool illustration-tool-one" /><div className="illustration-tool illustration-tool-two" /></div></div>
      </section>
      <section className="login-panel" aria-labelledby="auth-title"><div className="login-panel-inner"><div className="login-brand login-brand-panel"><img className="login-full-logo" src={workbenchLogo} alt="Workbench CMMS" /></div><div className="login-heading"><h1 id="auth-title">Welcome back</h1><p>Sign in to manage your facility operations.</p></div><form className="login-form" onSubmit={handleSubmit}><label className="login-field"><span>Email address</span><div className="login-input-wrap"><Mail size={18} aria-hidden="true" /><input type="email" name="email" placeholder="Enter your email" autoComplete="email" /></div></label><label className="login-field"><span>Password</span><div className="login-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input type={showPassword ? 'text' : 'password'} name="password" placeholder="Enter your password" autoComplete="current-password" /><button type="button" className="login-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><div className="login-options"><label className="login-checkbox"><input type="checkbox" name="remember" /><span>Remember me</span></label><button type="button" className="login-link" onClick={() => onNavigate?.('Forgot Password')}>Forgot password?</button></div><Button type="submit" ripple disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting && <LoaderCircle className="auth-loading-spinner" size={17} aria-hidden="true" />}{isSubmitting ? 'Logging in…' : 'Log in'}</Button></form><p className="login-signup"><span className="login-signup-prompt">Don’t have an account? </span><button type="button" className="login-link" onClick={() => onNavigate?.('Signup')}><span className="login-signup-desktop">Sign up.</span><span className="login-signup-mobile">Create account</span></button></p><p className="login-legal">By creating an account or logging in, you agree to the current <button type="button" className="login-link">Terms of Service</button> and <button type="button" className="login-link">Privacy Policy</button>.</p><div className="login-panel-footer"><button type="button" className="login-language">English <ChevronDown size={14} /></button><button type="button" className="login-support"><MessageCircle size={16} /> Get support</button></div></div></section>
    </main>
  )
}
