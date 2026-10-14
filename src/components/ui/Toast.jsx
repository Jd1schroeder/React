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

const toastSwipeThreshold = 72

function ToastItem({ toast, onDismiss }) {
  const touchStartRef = useRef(null)
  const swipeOffsetRef = useRef(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const Icon = toast.icon ?? defaultIcons[toast.tone] ?? defaultIcons.info

  const resetSwipe = () => {
    touchStartRef.current = null
    swipeOffsetRef.current = 0
    setIsSwiping(false)
    setSwipeOffset(0)
  }

  const handleTouchStart = (event) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    swipeOffsetRef.current = 0
    setIsSwiping(true)
  }

  const handleTouchMove = (event) => {
    const start = touchStartRef.current
    const touch = event.touches[0]
    if (!start || !touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      resetSwipe()
      return
    }
    swipeOffsetRef.current = deltaX
    setSwipeOffset(deltaX)
  }

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    if (!start || !touch) {
      resetSwipe()
      return
    }
    const deltaX = touch.clientX - start.x
    if (Math.abs(deltaX) >= toastSwipeThreshold && Math.abs(swipeOffsetRef.current) >= toastSwipeThreshold) {
      onDismiss(toast.id)
      return
    }
    resetSwipe()
  }

  return <div
    className={`wb-toast is-${toast.tone}${isSwiping ? ' is-swiping' : ''}`}
    role="status"
    aria-live="polite"
    style={swipeOffset ? { transform: `translateX(${swipeOffset}px)` } : undefined}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    onTouchCancel={resetSwipe}
  >
    {createElement(Icon, { size: 18, 'aria-hidden': true })}
    <span>{toast.message}</span>
    <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
      <X size={17} aria-hidden="true" />
    </button>
  </div>
}

function ToastViewport({ toasts, onDismiss }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="wb-toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />)}
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

