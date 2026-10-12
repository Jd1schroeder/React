import './PublicLegalFooter.css'

export function PublicLegalFooter({ onNavigate, activePage, compact = false }) {
  return <footer className={`public-legal-footer${compact ? ' is-compact' : ''}`}>
    <nav className="public-legal-footer-nav" aria-label="Legal navigation">
      <button type="button" aria-current={activePage === 'terms' ? 'page' : undefined} onClick={() => onNavigate?.('Terms of Service')}>Terms of Service</button>
      <button type="button" aria-current={activePage === 'privacy' ? 'page' : undefined} onClick={() => onNavigate?.('Privacy Policy')}>Privacy Policy</button>
      <a href="mailto:support@workbench.com">Support</a>
    </nav>
    {!compact && <><p>Last updated: October 12, 2026</p><p>&copy; 2026 Workbench, Inc. All rights reserved.</p></>}
  </footer>
}
