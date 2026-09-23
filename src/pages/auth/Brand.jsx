import workbenchIcon from '../../assets/workbench-icon.png'

export function Brand({ onNavigate }) {
  return <button type="button" className="login-brand login-brand-light" onClick={() => onNavigate?.('Splash')} aria-label="Go to Workbench home"><img className="login-brand-mark" src={workbenchIcon} alt="" /><span>Workbench</span></button>
}
