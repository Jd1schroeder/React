import { ArrowRight, CheckCircle2, ClipboardCheck, ShieldCheck, UsersRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import workbenchIcon from '../assets/workbench-icon.png'
import workbenchLogo from '../assets/workbench-logo.png'
import './Splash.css'

export function Splash({ onNavigate }) {
  return (
    <main className="splash-page">
      <section className="splash-visual" aria-label="Workbench facility operations">
        <div className="splash-grid" />
        <div className="splash-orb splash-orb-one" />
        <div className="splash-orb splash-orb-two" />
        <div className="splash-visual-content">
          <div className="splash-brand"><img src={workbenchIcon} alt="" /><span>Workbench</span></div>
          <div className="splash-message"><p>FACILITY OPERATIONS</p><h1>Keep every team, tool, and task moving.</h1><span>One clear workspace for the work that keeps your facility running.</span></div>
          <div className="splash-dashboard" aria-hidden="true"><div className="splash-dashboard-top" /><div className="splash-dashboard-row"><ClipboardCheck size={21} /><span /><i /></div><div className="splash-dashboard-row"><ShieldCheck size={21} /><span /><i /></div><div className="splash-dashboard-row"><UsersRound size={21} /><span /><i /></div></div>
        </div>
      </section>
      <section className="splash-content" aria-labelledby="splash-title">
        <img className="splash-logo" src={workbenchLogo} alt="Workbench CMMS" />
        <div className="splash-copy"><p className="splash-eyebrow">THE WORKSPACE FOR BETTER MAINTENANCE</p><h2 id="splash-title">Run your facility with confidence.</h2><p>Plan work, manage assets, and keep your team aligned from one simple workspace.</p></div>
        <div className="splash-actions"><Button type="button" ripple onClick={() => onNavigate?.('Signup')}>Create account <ArrowRight size={17} /></Button><button type="button" className="splash-login-link" onClick={() => onNavigate?.('Login')}>Already have an account? <span>Log in</span></button></div>
        <ul className="splash-checklist"><li><CheckCircle2 size={16} /> Organize every maintenance task</li><li><CheckCircle2 size={16} /> Give your team one source of truth</li><li><CheckCircle2 size={16} /> Start without a credit card</li></ul>
      </section>
    </main>
  )
}
