import { useEffect, useRef, useState } from 'react'
import { AsYouType } from 'libphonenumber-js'
import { ChevronDown, Phone, X } from 'lucide-react'
import flagAustralia from '../../assets/flags/au.svg'
import flagCanada from '../../assets/flags/ca.svg'
import flagUnitedKingdom from '../../assets/flags/gb.svg'
import flagUnitedStates from '../../assets/flags/us.svg'

export function TeamSizeDropdown() {
  const options = ['1-10 people', '11-50 people', '51-200 people', '201+ people']
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState('')
  return <div className="signup-select-wrap">
    <button type="button" className={`signup-select-button ${value ? 'has-value' : ''}`} aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}><span>{value || 'Select your team size'}</span><ChevronDown size={17} aria-hidden="true" /></button>
    {isOpen && <div className="signup-select-menu" role="listbox" aria-label="Team size options">{options.map((option) => <button key={option} type="button" role="option" aria-selected={value === option} className={value === option ? 'selected' : ''} onClick={() => { setValue(option); setIsOpen(false) }}>{option}</button>)}</div>}
    <input type="hidden" name="teamSize" value={value} />
  </div>
}

const phoneCountryOptions = [
  { code: 'US', dialCode: '+1', flag: flagUnitedStates, label: 'United States', maxDigits: 10 },
  { code: 'CA', dialCode: '+1', flag: flagCanada, label: 'Canada', maxDigits: 10 },
  { code: 'GB', dialCode: '+44', flag: flagUnitedKingdom, label: 'United Kingdom', maxDigits: 11 },
  { code: 'AU', dialCode: '+61', flag: flagAustralia, label: 'Australia', maxDigits: 10 },
]

function PhoneCountryDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  useEffect(() => {
    if (!isOpen) return undefined
    const handleOutsidePointer = (event) => { if (!dropdownRef.current?.contains(event.target)) setIsOpen(false) }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [isOpen])
  return <div ref={dropdownRef} className="signup-country-wrap">
    <button type="button" className="signup-country-button" aria-label="Phone country code" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}><img src={value.flag} alt="" /><span>{value.dialCode}</span><ChevronDown size={13} aria-hidden="true" /></button>
    {isOpen && <div className="signup-country-menu" role="listbox" aria-label="Phone country codes">{phoneCountryOptions.map((option) => <button key={option.code} type="button" role="option" aria-selected={value.code === option.code} onClick={() => { onChange(option); setIsOpen(false) }}><img src={option.flag} alt="" /><span>{option.label}</span><strong>{option.dialCode}</strong></button>)}</div>}
    <input type="hidden" name="phoneCountry" value={value.code} />
  </div>
}

export function PhoneField() {
  const [country, setCountry] = useState(phoneCountryOptions[0])
  const [phone, setPhone] = useState('')
  const handleCountryChange = (nextCountry) => { setCountry(nextCountry); setPhone(new AsYouType(nextCountry.code).input(phone.replace(/\D/g, '').slice(0, nextCountry.maxDigits))) }
  const handlePhoneChange = (event) => { const digits = event.target.value.replace(/\D/g, '').slice(0, country.maxDigits); setPhone(new AsYouType(country.code).input(digits)) }
  return <div className="login-input-wrap signup-phone-wrap">
    <PhoneCountryDropdown value={country} onChange={handleCountryChange} /><Phone size={18} aria-hidden="true" /><input type="tel" name="phone" value={phone} onChange={handlePhoneChange} inputMode="tel" placeholder="Enter your mobile number" autoComplete="tel" />
    {phone && <button type="button" className="signup-phone-clear" onClick={() => setPhone('')} aria-label="Clear mobile number"><X size={16} /></button>}
  </div>
}
