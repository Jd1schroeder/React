import { useCallback, useRef, useState } from 'react'

function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(max-width: 840px)').matches ?? window.innerWidth <= 840
}

export function useMobileSheetDismiss(onDismiss) {
  const touchStartYRef = useRef(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [hasStartedDrag, setHasStartedDrag] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnappingBack, setIsSnappingBack] = useState(false)

  const handleTouchStart = useCallback((event) => {
    if (!isMobileViewport() || event.touches?.length !== 1) return
    if (event.target.closest?.('button, a, input, select, textarea, [data-no-sheet-drag]')) return

    touchStartYRef.current = event.touches[0].clientY
    setHasStartedDrag(true)
    setIsDragging(true)
    setIsSnappingBack(false)
  }, [])

  const handleTouchMove = useCallback((event) => {
    if (touchStartYRef.current === null) return
    const currentTouch = event.touches?.[0]
    if (currentTouch) setDragOffset(Math.max(0, currentTouch.clientY - touchStartYRef.current))
  }, [])

  const finishTouch = useCallback((event, allowDismiss) => {
    if (touchStartYRef.current === null) return
    const endTouch = event.changedTouches?.[0]
    const pulledDistance = Math.max(dragOffset, endTouch ? endTouch.clientY - touchStartYRef.current : 0)
    touchStartYRef.current = null

    if (allowDismiss && pulledDistance >= Math.max(96, window.innerHeight * 0.16)) {
      onDismiss()
      return
    }

    setIsDragging(false)
    setIsSnappingBack(true)
    setDragOffset(0)
  }, [dragOffset, onDismiss])

  const handleTouchEnd = useCallback((event) => finishTouch(event, true), [finishTouch])
  const handleTouchCancel = useCallback((event) => finishTouch(event, false), [finishTouch])
  const handleTransitionEnd = useCallback((event) => {
    if (event.target === event.currentTarget && event.propertyName === 'transform') setIsSnappingBack(false)
  }, [])

  const dragClassName = [
    hasStartedDrag && 'is-mobile-sheet-drag-ready',
    isDragging && 'is-mobile-sheet-dragging',
    isSnappingBack && 'is-mobile-sheet-snapping-back',
  ].filter(Boolean).join(' ')

  return {
    dragClassName,
    dragStyle: { '--mobile-sheet-drag-offset': `${dragOffset}px` },
    dragHandleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    onTransitionEnd: handleTransitionEnd,
  }
}
