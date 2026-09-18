import { useState } from 'react'

export function Button({ children, variant = 'primary', ripple = false, className = '', onClick, ...props }) {
  const [rippleState, setRippleState] = useState(null)

  const handleClick = (event) => {
    if (ripple) {
      const bounds = event.currentTarget.getBoundingClientRect()
      const size = Math.max(bounds.width, bounds.height) * 2
      const x = (event.clientX || bounds.left + bounds.width / 2) - bounds.left - size / 2
      const y = (event.clientY || bounds.top + bounds.height / 2) - bounds.top - size / 2
      setRippleState({ x, y, size })
    }
    onClick?.(event)
  }

  return (
    <button className={`button button-${variant} ${ripple ? 'button-ripple' : ''} ${className}`} onClick={handleClick} {...props}>
      {children}
      {rippleState && <span className="button-ripple-effect" onAnimationEnd={() => setRippleState(null)} style={{ left: rippleState.x, top: rippleState.y, width: rippleState.size, height: rippleState.size }} aria-hidden="true" />}
    </button>
  )
}
