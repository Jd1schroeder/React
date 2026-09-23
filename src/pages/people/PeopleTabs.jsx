export function PeopleTabs({ active, onNavigate }) {
  return <nav className="people-tabs" aria-label="People sections">
    <button type="button" className={active === 'users' ? 'is-active' : ''} onClick={() => onNavigate('Users')}>Users</button>
    <button type="button" className={active === 'teams' ? 'is-active' : ''} onClick={() => onNavigate('Teams')}>Teams</button>
  </nav>
}
