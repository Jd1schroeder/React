import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import './FloatingCreateButton.css'

export function FloatingCreateButton({ label = 'Create', onClick, className = '', scrollContainerSelector, ...buttonProps }) {
  const buttonRef = useRef(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const pageContent = buttonRef.current?.closest('.page-content')
    if (!pageContent) return undefined

    const getScrollTop = (event) => {
      if (!scrollContainerSelector) return pageContent.scrollTop
      const eventTarget = event?.target
      const matchingTarget = eventTarget instanceof Element
        ? (eventTarget.matches(scrollContainerSelector) ? eventTarget : eventTarget.closest(scrollContainerSelector))
        : null
      if (matchingTarget) return matchingTarget.scrollTop
      if (eventTarget && eventTarget !== pageContent) return null
      return pageContent.querySelector(scrollContainerSelector)?.scrollTop ?? 0
    }
    const updateCollapsedState = (event) => {
      const scrollTop = getScrollTop(event)
      if (scrollTop !== null) setIsCollapsed(scrollTop > 8)
    }

    updateCollapsedState()
    pageContent.addEventListener('scroll', updateCollapsedState, { capture: true, passive: true })
    return () => pageContent.removeEventListener('scroll', updateCollapsedState, { capture: true })
  }, [scrollContainerSelector])

  return <button
    {...buttonProps}
    ref={buttonRef}
    type="button"
    className={`floating-create-button${isCollapsed ? ' is-collapsed' : ''}${className ? ` ${className}` : ''}`}
    aria-label={buttonProps['aria-label'] ?? label}
    onClick={onClick}
  >
    <Plus size={24} aria-hidden="true" />
    <span>{label}</span>
  </button>
}
