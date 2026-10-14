import { Info, Link2, LockKeyhole, Mail, Plus, RotateCcw, Share2, Trash2, X } from 'lucide-react'
import { useState } from 'react'

function expirationLabel(value) {
  return {
    work_order_closed: 'the Work Order is closed',
    '1_day': '1 day',
    '2_days': '2 days',
    '3_days': '3 days',
    '4_days': '4 days',
    '5_days': '5 days',
    '7_days': '7 days',
    '30_days': '30 days',
    '90_days': '90 days',
  }[value] ?? 'the Work Order is closed'
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function ExternalWorkOrderShareDialog({ title, share, expiration, isLoading, isSaving, error, onClose, onEnable, onDisable, onReset, onCopy, onSaveContacts }) {
  const isEnabled = Boolean(share?.enabled)
  const [contacts, setContacts] = useState(() => share?.contacts ?? [])
  const [vendorName, setVendorName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [contactError, setContactError] = useState('')

  const addContact = () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setContactError('Enter a valid email address.')
      return
    }
    if (contacts.some((contact) => contact.email.toLowerCase() === normalizedEmail)) {
      setContactError('That email address is already selected.')
      return
    }
    setContacts((current) => [...current, { vendorName: vendorName.trim(), displayName: displayName.trim(), email: normalizedEmail }])
    setVendorName('')
    setDisplayName('')
    setEmail('')
    setContactError('')
  }

  return (
    <div className="external-work-order-share-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose() }}>
      <section className="external-work-order-share-dialog" role="dialog" aria-modal="true" aria-labelledby="external-work-order-share-title">
        <header className="external-work-order-share-header">
          <div>
            <p>External Work Orders</p>
            <h2 id="external-work-order-share-title">Share &quot;{title}&quot;</h2>
          </div>
          <button type="button" aria-label="Close external sharing" onClick={onClose} disabled={isSaving}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="external-work-order-share-body">
          <p className="external-work-order-share-description">Share a secure external link to this Work Order. External contacts only see the fields and actions allowed by your organization&apos;s access settings.</p>
          <p className="external-work-order-share-info" role="note"><Info size={17} aria-hidden="true" />External access is limited to this Work Order. Contacts cannot browse other information in your organization.</p>
          {error && <p className="external-work-order-share-error" role="alert">{error}</p>}

          {isLoading ? <p className="external-work-order-share-loading" role="status">Loading sharing settings...</p> : <>
            <div className="external-work-order-share-control">
              <div>
                <div className="external-work-order-share-control-label">
                  <strong>Enable External Link</strong>
                  <span className="external-work-order-share-help">
                    <button type="button" aria-label="About external links" aria-describedby="external-work-order-share-help-text"><Info size={17} aria-hidden="true" /></button>
                    <span id="external-work-order-share-help-text" role="tooltip">Anyone with this link can access only this Work Order. They cannot see other organization information.</span>
                  </span>
                </div>
                <p>Anyone with the link can access only this shared Work Order.</p>
              </div>
              <button type="button" className={`external-work-order-share-toggle${isEnabled ? ' is-on' : ''}`} role="switch" aria-checked={isEnabled} aria-label="Enable External Link" onClick={() => { if (isEnabled) onDisable(); else onEnable() }} disabled={isSaving}>
                <span aria-hidden="true" />
              </button>
            </div>

            {isEnabled && <>
              <div className="external-work-order-share-link-actions">
                <button type="button" onClick={onCopy} disabled={isSaving}><Link2 size={16} aria-hidden="true" />{share?.token ? 'Copy External Link' : 'Generate New Link & Copy'}</button>
                <button type="button" className="is-danger" onClick={onReset} disabled={isSaving}><RotateCcw size={16} aria-hidden="true" />Reset Link</button>
              </div>
              <p className="external-work-order-share-expiration"><LockKeyhole size={15} aria-hidden="true" /> Link expires when {expirationLabel(expiration)}{share.expiresAt ? `, or on ${new Date(share.expiresAt).toLocaleDateString()}` : ''}.</p>
            </>}

            <section className="external-work-order-share-contacts" aria-labelledby="external-work-order-share-contacts-title">
              <h3 id="external-work-order-share-contacts-title">Vendor Contacts</h3>
              <p>Select the vendor contacts associated with this link. You can copy the secure link and send it to the selected contacts.</p>
              {!isEnabled ? <p className="external-work-order-share-contact-note"><Share2 size={15} aria-hidden="true" /> Enable the external link before selecting contacts.</p> : <>
                <div className="external-work-order-share-contact-form">
                  <label htmlFor="external-share-vendor-name">Vendor <span>(optional)</span></label>
                  <input id="external-share-vendor-name" value={vendorName} onChange={(event) => setVendorName(event.target.value)} maxLength="120" placeholder="Company name" disabled={isSaving} />
                  <label htmlFor="external-share-contact-name">Contact name <span>(optional)</span></label>
                  <input id="external-share-contact-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength="120" placeholder="Contact name" disabled={isSaving} />
                  <label htmlFor="external-share-contact-email">Email address</label>
                  <div className="external-work-order-share-contact-email"><input id="external-share-contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength="320" placeholder="vendor@example.com" disabled={isSaving} /><button type="button" onClick={addContact} disabled={isSaving || !email.trim()}><Plus size={16} aria-hidden="true" />Add contact</button></div>
                </div>
                {contactError && <p className="external-work-order-share-contact-error" role="alert">{contactError}</p>}
                {contacts.length > 0 && <ul className="external-work-order-share-contact-list">{contacts.map((contact) => <li key={contact.email}><div><strong>{contact.displayName || contact.email}</strong><span>{[contact.vendorName, contact.displayName && contact.email].filter(Boolean).join(' · ') || contact.email}</span></div><button type="button" aria-label={`Remove ${contact.email}`} onClick={() => setContacts((current) => current.filter((item) => item.email !== contact.email))} disabled={isSaving}><Trash2 size={16} aria-hidden="true" /></button></li>)}</ul>}
                <button type="button" className="external-work-order-share-save-contacts" onClick={() => onSaveContacts?.(contacts)} disabled={isSaving}><Mail size={16} aria-hidden="true" />Save vendor contacts</button>
              </>}
            </section>
          </>}
        </div>

        <footer className="external-work-order-share-footer">
          <button type="button" onClick={onClose} disabled={isSaving}>Close</button>
        </footer>
      </section>
    </div>
  )
}
