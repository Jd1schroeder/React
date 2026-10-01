import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './PresetNumberInput.css'

export function PresetNumberInput({ ariaLabel, defaultValue = '', maxValue, onChange, options = [], value: controlledValue }) {
  const optionsId = useId()
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const optionsRef = useRef(null)
  const scrollbarRef = useRef(null)
  const dragRef = useRef(null)
  const suppressFocusOpenRef = useRef(false)
  const [internalValue, setInternalValue] = useState(String(defaultValue))
  const value = controlledValue === undefined ? internalValue : String(controlledValue)
  const [isOpen, setIsOpen] = useState(false)
  const [scrollThumb, setScrollThumb] = useState({ height: 0, top: 0, visible: false })

  useEffect(() => {
    const handleOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined
    const element = optionsRef.current
    if (!element) return undefined

    const updateScrollThumb = () => {
      const { clientHeight, scrollHeight, scrollTop } = element
      const visible = scrollHeight > clientHeight
      const height = visible ? Math.max(20, (clientHeight * clientHeight) / scrollHeight) : 0
      const maxScrollTop = scrollHeight - clientHeight
      const top = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * (clientHeight - height) : 0
      setScrollThumb({ height, top, visible })
    }

    updateScrollThumb()
    const observer = new ResizeObserver(updateScrollThumb)
    observer.observe(element)
    return () => observer.disconnect()
  }, [isOpen, options.length])

  const handleScrollbarPointerMove = (event) => {
    if (!dragRef.current || !optionsRef.current || !scrollbarRef.current) return
    const element = optionsRef.current
    const trackHeight = scrollbarRef.current.clientHeight
    const maxThumbTop = trackHeight - scrollThumb.height
    const maxScrollTop = element.scrollHeight - element.clientHeight
    if (maxThumbTop <= 0) return
    const nextTop = Math.max(0, Math.min(maxThumbTop, dragRef.current.top + event.clientY - dragRef.current.startY))
    element.scrollTop = (nextTop / maxThumbTop) * maxScrollTop
  }

  const handleScrollbarPointerUp = () => { dragRef.current = null }

  const setValue = (nextValue) => {
    if (controlledValue === undefined) setInternalValue(nextValue)
    onChange?.(nextValue)
  }

  const selectOption = (option) => {
    setValue(String(option))
    setIsOpen(false)
    if (document.activeElement !== inputRef.current) {
      suppressFocusOpenRef.current = true
      inputRef.current?.focus()
    }
  }

  return (
    <div ref={rootRef} className="preset-number-input">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={optionsId}
        aria-expanded={isOpen}
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
        onFocus={() => {
          if (suppressFocusOpenRef.current) {
            suppressFocusOpenRef.current = false
            return
          }
          setIsOpen(true)
        }}
        onClick={() => setIsOpen(true)}
        onBlur={() => {
          if (maxValue !== undefined && value !== '') setValue(String(Math.min(Number(value), maxValue)))
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') setIsOpen(true)
          if (event.key === 'Escape') setIsOpen(false)
        }}
      />
      <button
        type="button"
        className="preset-number-input-trigger"
        aria-label={`Show ${ariaLabel.toLowerCase()} presets`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="preset-number-input-menu">
          <div id={optionsId} ref={optionsRef} className="preset-number-input-options" role="listbox" aria-label={`${ariaLabel} presets`} onScroll={(event) => {
            const element = event.currentTarget
            const { clientHeight, scrollHeight, scrollTop } = element
            const visible = scrollHeight > clientHeight
            const height = visible ? Math.max(20, (clientHeight * clientHeight) / scrollHeight) : 0
            const maxScrollTop = scrollHeight - clientHeight
            setScrollThumb({ height, top: maxScrollTop > 0 ? (scrollTop / maxScrollTop) * (clientHeight - height) : 0, visible })
          }}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={value === String(option)}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))}
          </div>
          {scrollThumb.visible && <div
            ref={scrollbarRef}
            className="preset-number-input-scrollbar"
            onPointerMove={handleScrollbarPointerMove}
            onPointerUp={handleScrollbarPointerUp}
            onPointerCancel={handleScrollbarPointerUp}
          >
            <div
              className="preset-number-input-scrollbar-thumb"
              style={{ height: scrollThumb.height, transform: `translateY(${scrollThumb.top}px)` }}
              onPointerDown={(event) => {
                event.preventDefault()
                event.currentTarget.setPointerCapture(event.pointerId)
                dragRef.current = { startY: event.clientY, top: scrollThumb.top }
              }}
            />
          </div>}
        </div>
      )}
    </div>
  )
}
