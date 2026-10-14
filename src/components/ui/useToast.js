import { useContext } from 'react'
import { ToastContext } from './ToastContext'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return { showToast: () => undefined, dismissToast: () => undefined }
  }
  return context
}
