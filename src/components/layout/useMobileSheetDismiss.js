import { useCallback, useEffect, useRef, useState } from 'react'

function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(max-width: 840px)').matches ?? window.innerWidth <= 840
}

export function useMobileSheetDismiss(onDismiss, sheetRef) {
  const touchStartYRef = useRef(null)
  const dragOffsetRef = useRef(0)
  const previousTouchRef = useRef(null)
  const latestTouchRef = useRef(null)
  const dismissTimeoutRef = useRef(null)
  const isDismissingRef = useRef(false)
  const [hasStartedDrag, setHasStartedDrag] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnappingBack, setIsSnappingBack] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => () => window.clearTimeout(dismissTimeoutRef.current), [])

  const completeDismiss = useCallback(() => {
    if (!isDismissingRef.current) return
    isDismissingRef.current = false
    window.clearTimeout(dismissTimeoutRef.current)
    onDismiss()
  }, [onDismiss])

  const handleTouchStart = useCallback((event) => {
    if (isDismissingRef.current || !isMobileViewport() || event.touches?.length !== 1) return
    if (event.target.closest?.('button, a, input, select, textarea, [data-no-sheet-drag]')) return

    const touch = { y: event.touches[0].clientY, time: event.timeStamp || performance.now() }
    touchStartYRef.current = touch.y
    dragOffsetRef.current = 0
    previousTouchRef.current = touch
    latestTouchRef.current = touch
    sheetRef.current?.style.setProperty('--mobile-sheet-drag-offset', '0px')
    setHasStartedDrag(true)
    setIsDragging(true)
    setIsSnappingBack(false)
  }, [sheetRef])

  const handleTouchMove = useCallback((event) => {
    if (touchStartYRef.current === null || isDismissingRef.current) return
    const currentTouch = event.touches?.[0]
    if (!currentTouch) return
    const latestTouch = latestTouchRef.current
    const time = Math.max(event.timeStamp || performance.now(), (latestTouch?.time ?? 0) + 1)
    const nextTouch = { y: currentTouch.clientY, time }
    previousTouchRef.current = latestTouch
    latestTouchRef.current = nextTouch
    dragOffsetRef.current = Math.max(0, nextTouch.y - touchStartYRef.current)
    sheetRef.current?.style.setProperty('--mobile-sheet-drag-offset', `${dragOffsetRef.current}px`)
  }, [sheetRef])

  const snapBack = useCallback(() => {
    touchStartYRef.current = null
    setIsDragging(false)
    setIsSnappingBack(true)
  }, [])

  const finishTouch = useCallback((event, allowDismiss) => {
    if (touchStartYRef.current === null || isDismissingRef.current) return
    const endTouch = event.changedTouches?.[0]
    const latestTouch = latestTouchRef.current
    const previousTouch = previousTouchRef.current
    const endY = endTouch?.clientY ?? latestTouch?.y ?? touchStartYRef.current
    const pulledDistance = Math.max(dragOffsetRef.current, endY - touchStartYRef.current)
    let velocity = 0
    if (latestTouch && previousTouch && latestTouch.time > previousTouch.time) {
      velocity = (latestTouch.y - previousTouch.y) / (latestTouch.time - previousTouch.time)
    }
    const eventTime = event.timeStamp || performance.now()
    if (endTouch && latestTouch && endY !== latestTouch.y && eventTime > latestTouch.time) {
      velocity = (endY - latestTouch.y) / (eventTime - latestTouch.time)
    }
    touchStartYRef.current = null
    const shouldDismiss = pulledDistance >= Math.max(88, window.innerHeight * 0.12)
      || (pulledDistance >= 48 && velocity >= 0.7)

    if (allowDismiss && shouldDismiss) {
      isDismissingRef.current = true
      setIsDragging(false)
      setIsSnappingBack(false)
      setIsDismissing(true)
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        completeDismiss()
      } else {
        dismissTimeoutRef.current = window.setTimeout(completeDismiss, 280)
      }
      return
    }

    snapBack()
  }, [completeDismiss, snapBack])

  const handleTouchEnd = useCallback((event) => finishTouch(event, true), [finishTouch])
  const handleTouchCancel = useCallback((event) => finishTouch(event, false), [finishTouch])
  const handleTransitionEnd = useCallback((event) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
    if (isDismissingRef.current) {
      completeDismiss()
      return
    }
    setIsSnappingBack(false)
    sheetRef.current?.style.setProperty('--mobile-sheet-drag-offset', '0px')
  }, [completeDismiss, sheetRef])

  const dragClassName = [
    hasStartedDrag && 'is-mobile-sheet-drag-ready',
    isDragging && 'is-mobile-sheet-dragging',
    isSnappingBack && 'is-mobile-sheet-snapping-back',
    isDismissing && 'is-mobile-sheet-dismissing',
  ].filter(Boolean).join(' ')

  return {
    dragClassName,
    backdropClassName: isDismissing ? 'is-mobile-sheet-dismissing' : '',
    dragHandleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    onTransitionEnd: handleTransitionEnd,
  }
}
