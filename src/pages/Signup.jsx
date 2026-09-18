import { AuthPage } from './AuthPage'

export function Signup({ onNavigate }) {
  return <AuthPage mode="signup" onNavigate={onNavigate} />
}
