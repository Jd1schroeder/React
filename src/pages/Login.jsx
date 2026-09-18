import { AuthPage } from './AuthPage'

export function Login({ onNavigate }) {
  return <AuthPage mode="login" onNavigate={onNavigate} />
}
