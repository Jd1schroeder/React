import { useEffect, useRef } from 'react'

export function useDismissibleMenu(isOpen, onDismiss) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handleOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) onDismiss()
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onDismiss])

  return rootRef
}
