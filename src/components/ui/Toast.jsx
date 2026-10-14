import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { ToastContext } from './ToastContext'
import './Toast.css'

const defaultIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

function ToastViewport({ toasts, onDismiss }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="wb-toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = toast.icon ?? defaultIcons[toast.tone] ?? defaultIcons.info
        return (
          <div key={toast.id} className={`wb-toast is-${toast.tone}`} role="status" aria-live="polite">
            {createElement(Icon, { size: 18, 'aria-hidden': true })}
            <span>{toast.message}</span>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) window.clearTimeout(timer)
    timersRef.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, { tone = 'success', duration = 7000, icon } = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((current) => [...current, { id, message, tone, icon }])
    if (duration !== false) {
      const timer = window.setTimeout(() => dismissToast(id), duration)
      timersRef.current.set(id, timer)
    }
    return id
  }, [dismissToast])

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current.clear()
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

