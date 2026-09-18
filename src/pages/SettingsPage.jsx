import { AlertTriangle, Bell, Building2, ChevronDown, CreditCard, Gauge, Link2, Palette, Plus, ShieldCheck, UsersRound, X } from 'lucide-react'
import { useState } from 'react'
import './SettingsPage.css'

const settings = {
  'Settings / General': { group: 'Organization Settings', title: 'General', description: 'Manage the basic details and defaults for this workspace.', icon: Building2 },
  'Settings / Features': { group: 'Organization Settings', title: 'Features', description: 'Choose the capabilities available to your workspace.', icon: Gauge },
  'Settings / Subscription': { group: 'Organization Settings', title: 'Subscription', description: 'Review workspace plan and billing configuration.', icon: CreditCard },
  'Settings / Manage Teammates': { group: 'Organization Settings', title: 'Manage Teammates', description: 'Manage members, roles, and workspace access.', icon: UsersRound },
  'Settings / Customizations': { group: 'Organization Settings', title: 'Customizations', description: 'Configure workspace terminology and appearance.', icon: Palette },
  'Settings / Integrations': { group: 'Organization Settings', title: 'Integrations', description: 'Connect Workbench with the tools your team uses.', icon: Link2 },
  'Settings / My Account': { group: 'Personal Settings', title: 'My Account', description: 'Manage your account details and security.', icon: ShieldCheck },
  'Settings / Profile Preferences': { group: 'Personal Settings', title: 'Profile Preferences', description: 'Set your personal preferences for Workbench.', icon: Palette },
  'Settings / Notification Settings': { group: 'Personal Settings', title: 'Notification Settings', description: 'Choose how Workbench should notify you.', icon: Bell },
  'Settings / Invite Users': { group: 'Personal Settings', title: 'Invite Users', description: 'Invite teammates to collaborate in this workspace.', icon: UsersRound },
}

const organizationPages = ['Settings / General', 'Settings / Features', 'Settings / Subscription', 'Settings / Manage Teammates', 'Settings / Customizations', 'Settings / Integrations']
const personalPages = ['Settings / My Account', 'Settings / Profile Preferences', 'Settings / Notification Settings', 'Settings / Invite Users']

export function SettingsPage({ pageName, onNavigate }) {
  if (pageName === 'Settings / Invite Users') return <InviteUsersPage onNavigate={onNavigate} />

  const current = settings[pageName] ?? settings['Settings / General']
  const Icon = current.icon

  return <div className="settings-page">
    <header className="settings-page-header"><div><p className="eyebrow">{current.group}</p><h1>{current.title}</h1><p>{current.description}</p></div></header>
    <div className="settings-layout">
      <SettingsNavigation pageName={pageName} onNavigate={onNavigate} />
      <section className="settings-content" aria-labelledby="settings-content-title">
        <div className="settings-content-icon"><Icon size={22} /></div>
        <h2 id="settings-content-title">{current.title}</h2>
        <p>This settings area is ready for its Supabase-backed configuration.</p>
        <div className="settings-placeholder"><span>No settings configured yet.</span><small>We’ll connect this section as its data model is implemented.</small></div>
      </section>
    </div>
  </div>
}

function InviteUsersPage({ onNavigate }) {
  const [invites, setInvites] = useState([{ name: '', contact: '', accountType: 'Full User' }])
  const [notifyInvites, setNotifyInvites] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const canSend = invites.every((invite) => invite.name.trim() && invite.contact.trim())

  const updateInvite = (index, field, value) => {
    setInvites((current) => current.map((invite, inviteIndex) => inviteIndex === index ? { ...invite, [field]: value } : invite))
  }

  const removeInvite = (index) => {
    setInvites((current) => current.length === 1 ? current : current.filter((_, inviteIndex) => inviteIndex !== index))
  }

  const copyInviteLink = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(`${window.location.origin}/signup`)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1800)
  }

  return <div className="settings-page invite-users-page">
    <header className="settings-page-header">
      <p className="eyebrow">Personal Settings</p>
      <h1>Invite Users</h1>
      <p>Invite teammates to collaborate in this workspace.</p>
    </header>
    <div className="settings-layout invite-users-layout">
      <SettingsNavigation pageName="Settings / Invite Users" onNavigate={onNavigate} />
      <section className="settings-content invite-card">
      <div className="invite-table-header"><span>Full Name</span><span>Mobile Phone Number or Email</span><span>Account Type</span><span aria-hidden="true" /></div>
      <div className="invite-rows">
        {invites.map((invite, index) => <div className="invite-row" key={index}>
          <input value={invite.name} onChange={(event) => updateInvite(index, 'name', event.target.value)} placeholder="Full name" aria-label={`Full name for invite ${index + 1}`} />
          <input value={invite.contact} onChange={(event) => updateInvite(index, 'contact', event.target.value)} placeholder="Mobile phone number or email" aria-label={`Phone or email for invite ${index + 1}`} />
          <label className="invite-account-type"><select value={invite.accountType} onChange={(event) => updateInvite(index, 'accountType', event.target.value)} aria-label={`Account type for invite ${index + 1}`}><option>Full User</option><option>Limited User</option><option>Requestor</option></select><ChevronDown size={16} aria-hidden="true" /></label>
          <button type="button" className="invite-remove" onClick={() => removeInvite(index)} aria-label={`Remove invite ${index + 1}`}><X size={18} /></button>
        </div>)}
      </div>
      <button type="button" className="invite-add-button" onClick={() => setInvites((current) => [...current, { name: '', contact: '', accountType: 'Full User' }])}><Plus size={16} /> Add another</button>
      <div className="invite-actions">
        <label className="invite-notify"><input type="checkbox" checked={notifyInvites} onChange={(event) => setNotifyInvites(event.target.checked)} /><span className="invite-switch" aria-hidden="true" /><span>Notify invitees</span></label>
        {!notifyInvites && <p className="invite-warning"><AlertTriangle size={18} /> Users will be added to the organization, but won’t be notified by email or SMS.</p>}
        <button type="button" className="invite-send-button" disabled={!canSend} onClick={() => setInvites([{ name: '', contact: '', accountType: 'Full User' }])}>Send Invite</button>
        <button type="button" className="invite-link-button" onClick={copyInviteLink}><Link2 size={17} /> {linkCopied ? 'Invite link copied' : 'Get an invite link to share'}</button>
      </div>
      </section>
    </div>
  </div>
}

function SettingsNavigation({ pageName, onNavigate }) {
  const renderNav = (pages) => pages.map((page) => <button key={page} type="button" className={page === pageName ? 'settings-nav-item is-active' : 'settings-nav-item'} onClick={() => onNavigate(page)}>{settings[page].title}</button>)
  return <aside className="settings-navigation" aria-label="Settings navigation">
    <p className="settings-nav-heading">Organization Settings</p>
    {renderNav(organizationPages)}
    <p className="settings-nav-heading">Personal Settings</p>
    {renderNav(personalPages)}
  </aside>
}
