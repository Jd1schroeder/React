import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import workbench404 from '../assets/workbench-404-clean.png'
import './NotFound.css'

export function NotFound({ onNavigate }) {
  return (
    <main className="not-found-page">
      <div className="not-found-brand">
        <span className="not-found-brand-mark">W</span>
        <span>Workbench</span>
      </div>
      <div className="not-found-art-frame">
        <img className="not-found-art" src={workbench404} alt="Workbench maintenance illustration with error 404" />
      </div>
      <div className="not-found-content">
        <h1>Oops! Looks like youÃ¢â‚¬â„¢re lost.</h1>
        <p>The page youÃ¢â‚¬â„¢re looking for doesnÃ¢â‚¬â„¢t exist or has been moved.<br />LetÃ¢â‚¬â„¢s get you back on track.</p>
        <Button onClick={() => onNavigate('Work Orders')}><ArrowLeft size={17} /> Go to Workbench</Button>
      </div>
    </main>
  )
}
