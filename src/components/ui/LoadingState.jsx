import './LoadingState.css'

export function LoadingState({ message = 'Loading...', className = '' }) {
  return <div className={`loading-state ${className}`.trim()} role="status" aria-busy="true">
    <span className="loading-state-spinner" aria-hidden="true" />
    <span>{message}</span>
  </div>
}
