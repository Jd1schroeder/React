import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, LockKeyhole, PanelLeft, Table2 } from 'lucide-react'
import './PanelViewSelector.css'

const defaultViews = [
  { value: 'panel', label: 'Panel View', icon: PanelLeft },
  { value: 'table', label: 'Table View', icon: Table2, disabled: true },
]

export function PanelViewSelector({ activeView = 'panel', onViewChange, options = defaultViews }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const [isOpen, setIsOpen] = useState(false)
  const activeIndex = options.findIndex((option) => option.value === activeView)
  const selectedOption = options[activeIndex >= 0 ? activeIndex : 0] ?? defaultViews[0]
  const [highlightedIndex, setHighlightedIndex] = useState(activeIndex >= 0 ? activeIndex : 0)
  const SelectedIcon = selectedOption.icon

  useEffect(() => {
    if (!isOpen) return undefined
    const handleOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) optionRefs.current[highlightedIndex]?.focus()
  }, [highlightedIndex, isOpen])

  const selectOption = (option) => {
    if (option.disabled) return
    onViewChange?.(option.value, option)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setHighlightedIndex(activeIndex >= 0 ? activeIndex : 0)
      setIsOpen(true)
    }
  }

  const handleOptionKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.min(index + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (options[highlightedIndex]) selectOption(options[highlightedIndex])
    }
  }

  return <div ref={rootRef} className="panel-view-selector">
    <button
      ref={triggerRef}
      type="button"
      className="panel-view-selector-trigger"
      aria-label="Select panel view"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      onClick={() => setIsOpen((open) => !open)}
      onKeyDown={handleTriggerKeyDown}
    >
      <span className="panel-view-selector-current">
        {SelectedIcon && <SelectedIcon size={18} strokeWidth={1.8} aria-hidden="true" />}
        <span>{selectedOption.label}</span>
      </span>
      <ChevronDown className="panel-view-selector-chevron" size={15} strokeWidth={1.8} aria-hidden="true" />
    </button>
    {isOpen && <div className="panel-view-selector-menu" role="listbox" aria-label="Panel view options">
      {options.map((option, index) => {
        const OptionIcon = option.icon
        return <button
          ref={(element) => { optionRefs.current[index] = element }}
          key={option.value}
          type="button"
          role="option"
          aria-selected={option.value === selectedOption.value}
          aria-disabled={option.disabled || undefined}
          disabled={option.disabled}
          className={`${option.value === selectedOption.value ? 'is-selected ' : ''}${option.disabled ? 'is-disabled' : ''}`.trim()}
          onClick={() => selectOption(option)}
          onKeyDown={handleOptionKeyDown}
          onMouseEnter={() => setHighlightedIndex(index)}
        >
          {OptionIcon && <OptionIcon size={18} strokeWidth={1.8} aria-hidden="true" />}
          <span>{option.label}</span>
          {option.disabled ? <LockKeyhole className="panel-view-selector-check" size={15} strokeWidth={1.8} aria-hidden="true" /> : option.value === selectedOption.value && <Check className="panel-view-selector-check" size={18} strokeWidth={2} aria-hidden="true" />}
        </button>
      })}
    </div>}
  </div>
}
