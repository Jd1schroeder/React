import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import workbenchIcon from '../../assets/workbench-icon-2x.png'
import './PublicMobileHeader.css'

function MenuIcon({ isOpen = false }) {
  return <span className={`public-mobile-menu-icon${isOpen ? ' is-open' : ''}`} aria-hidden="true"><span /><span /><span /></span>
}

export function PublicMobileHeader({ onNavigate, dark = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isMenuOpen])

  const navigateFromMenu = (page) => {
    setIsMenuOpen(false)
    onNavigate?.(page)
  }

  return <>
    <header className={`public-mobile-header${dark ? ' is-dark' : ''}`}>
      <button type="button" className="public-mobile-brand" onClick={() => navigateFromMenu('Splash')} aria-label="Go to Workbench home"><img src={workbenchIcon} alt="" /><span>Workbench</span></button>
      <button type="button" className="public-mobile-menu-button" aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={isMenuOpen} aria-controls={isMenuOpen ? 'public-mobile-menu' : undefined} onClick={() => setIsMenuOpen(true)}><MenuIcon isOpen={isMenuOpen} /></button>
    </header>
    {isMenuOpen && <div id="public-mobile-menu" className="public-mobile-menu" role="dialog" aria-modal="true" aria-label="Main menu">
      <div className="public-mobile-menu-header">
        <button type="button" className="public-mobile-brand" onClick={() => navigateFromMenu('Splash')} aria-label="Go to Workbench home"><img src={workbenchIcon} alt="" /><span>Workbench</span></button>
        <button type="button" className="public-mobile-menu-button" aria-label="Close menu" onClick={() => setIsMenuOpen(false)}><MenuIcon isOpen /></button>
      </div>
      <nav className="public-mobile-nav" aria-label="Public navigation">
        <button type="button" onClick={() => navigateFromMenu('Splash')}>Home</button>
        <button type="button" onClick={() => navigateFromMenu('Login')}>Log in</button>
        <button type="button" className="public-mobile-nav-primary" onClick={() => navigateFromMenu('Signup')}>Create account <ArrowRight size={17} /></button>
      </nav>
    </div>}
  </>
}
