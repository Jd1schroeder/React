import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './Select.css'

function normalizeOption(option) {
  return typeof option === 'string' ? { label: option, value: option } : option
}

export function Select({ ariaLabel, className = '', name, onChange, options = [], placeholder = 'Select an option', value = '' }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const normalizedOptions = options.map(normalizeOption)
  const selectedIndex = normalizedOptions.findIndex((option) => option.value === value)
  const selectedOption = normalizedOptions[selectedIndex]
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0)

  useEffect(() => {
    if (!isOpen) return undefined
    const handleOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) optionRefs.current[highlightedIndex]?.focus()
  }, [highlightedIndex, isOpen])

  const selectOption = (option) => {
    onChange?.(option.value, option)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
      setIsOpen(true)
    }
  }

  const handleOptionKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.min(index + 1, normalizedOptions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (normalizedOptions[highlightedIndex]) selectOption(normalizedOptions[highlightedIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    }
  }

  return <div ref={rootRef} className={`select ${className}`.trim()}>
    <button ref={triggerRef} type="button" className={`select-trigger ${selectedOption ? 'has-value' : ''}`} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} onKeyDown={handleTriggerKeyDown}>
      <span>{selectedOption?.label ?? placeholder}</span>
      <ChevronDown className="select-chevron" size={16} aria-hidden="true" />
    </button>
    {isOpen && <div className="select-menu" role="listbox" aria-label={ariaLabel}>
      {normalizedOptions.map((option, index) => {
        const OptionIcon = option.icon
        return <button ref={(element) => { optionRefs.current[index] = element }} key={option.value} type="button" role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} disabled={option.disabled} className={`${option.value === value ? 'is-selected ' : ''}${option.disabled ? 'is-disabled' : ''}`.trim()} onClick={() => selectOption(option)} onKeyDown={handleOptionKeyDown} onMouseEnter={() => setHighlightedIndex(index)}>{OptionIcon && <OptionIcon size={15} aria-hidden="true" />}<span>{option.label}</span></button>
      })}
    </div>}
    {name && <input type="hidden" name={name} value={value} />}
  </div>
}
