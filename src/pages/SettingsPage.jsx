import { AlertTriangle, Bell, Building2, Camera, CreditCard, Gauge, Link2, Monitor, Palette, Pencil, Plus, Save, ShieldCheck, UsersRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Select } from '../components/ui/Select'
import { getCurrentWorkspace } from '../services/workspaceService'
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
  if (pageName === 'Settings / Profile Preferences') return <ProfilePreferencesPage onNavigate={onNavigate} />

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
          <Select className="invite-account-type" value={invite.accountType} onChange={(value) => updateInvite(index, 'accountType', value)} ariaLabel={`Account type for invite ${index + 1}`} options={['Full User', 'Limited User', 'Requestor']} />
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

function ProfilePreferencesPage({ onNavigate }) {
  const [workspace, setWorkspace] = useState({ user: null, organization: null })
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [preferences, setPreferences] = useState({ language: 'English (Default)', dateFormat: 'MM/DD/YYYY', timeFormat: '11:59 PM', weekStart: 'Sunday' })

  useEffect(() => {
    getCurrentWorkspace().then((currentWorkspace) => {
      const user = currentWorkspace.user
      setWorkspace(currentWorkspace)
      setAvatarUrl(user?.user_metadata?.avatar_url ?? '')
      setEmail(user?.email ?? '')
      setPhone(user?.user_metadata?.phone ?? user?.phone ?? '')
    }).catch(() => setWorkspace({ user: null, organization: null }))
  }, [])

  const user = workspace.user
  const displayName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ') || user?.email || 'Your profile'
  const initials = displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const role = workspace.organization?.role === 'owner' ? 'Administrator' : workspace.organization?.role || 'Member'

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarUrl(URL.createObjectURL(file))
  }

  return <div className="settings-page profile-preferences-page">
    <header className="settings-page-header">
      <p className="eyebrow">Personal Settings</p>
      <h1>Profile Preferences</h1>
      <p>Manage your profile and personal workspace preferences.</p>
    </header>
    <div className="settings-layout">
      <SettingsNavigation pageName="Settings / Profile Preferences" onNavigate={onNavigate} />
      <section className="profile-preferences-content" aria-label="Profile preferences">
        <div className="profile-identity">
          <label className="profile-avatar-upload">
            <input type="file" accept="image/gif,image/jpeg,image/png,image/heic,image/heif" onChange={handleAvatarChange} />
            {avatarUrl ? <img src={avatarUrl} alt={`${displayName} profile`} /> : <span>{initials || 'A'}</span>}
            <span className="profile-avatar-overlay"><Camera size={22} /></span>
          </label>
          <h2>{displayName}</h2>
          <p>{role}</p>
        </div>

        <section className="profile-settings-card">
          <div className="profile-card-heading"><h2>Personal Info</h2><button type="button" className="profile-edit-button" onClick={() => setIsEditingInfo((value) => !value)}>{isEditingInfo ? <X size={16} /> : <Pencil size={16} />}<span className="sr-only">{isEditingInfo ? 'Cancel editing personal info' : 'Edit personal info'}</span></button></div>
          <div className="profile-info-grid">
            <div><span>Email</span>{isEditingInfo ? <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /> : <strong>{email || 'Not provided'}</strong>}</div>
            <div><span>Phone Number</span>{isEditingInfo ? <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="Not provided" /> : <strong>{phone || 'Not provided'}</strong>}</div>
          </div>
          {isEditingInfo && <button type="button" className="profile-save-button" onClick={() => setIsEditingInfo(false)}><Save size={15} /> Save changes</button>}
        </section>

        <section className="profile-settings-card profile-preferences-card">
          <div className="profile-card-heading"><h2>Localization Settings</h2></div>
          <div className="profile-preference-list">
            <label>Language<Select value={preferences.language} onChange={(value) => setPreferences({ ...preferences, language: value })} ariaLabel="Language" options={['English (Default)', 'Spanish', 'French']} /></label>
            <label>Date Format<Select value={preferences.dateFormat} onChange={(value) => setPreferences({ ...preferences, dateFormat: value })} ariaLabel="Date Format" options={['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']} /></label>
            <label>Time Format<Select value={preferences.timeFormat} onChange={(value) => setPreferences({ ...preferences, timeFormat: value })} ariaLabel="Time Format" options={['11:59 PM', '23:59']} /></label>
            <label>Beginning of Week<Select value={preferences.weekStart} onChange={(value) => setPreferences({ ...preferences, weekStart: value })} ariaLabel="Beginning of Week" options={['Sunday', 'Monday']} /></label>
          </div>
        </section>

        <section className="profile-settings-card">
          <h2>Sessions</h2>
          <h3>Linked Devices</h3>
          <div className="profile-empty-state"><Monitor size={18} /><span>No linked devices available.</span></div>
        </section>

        <section className="profile-settings-card profile-quit-card">
          <div className="profile-quit-copy"><ShieldCheck size={22} /><div><h2>Quit Organization</h2><p>If you quit, you will lose access to this organization and will need to be re-invited to join again.</p></div></div>
          <button type="button" className="profile-danger-button" disabled>Quit Organization</button>
        </section>
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
