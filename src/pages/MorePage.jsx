import { useEffect, useState } from 'react'
import { BellOff, Bot, Building2, ChevronRight, UserRoundPlus } from 'lucide-react'
import { sidebarGroups } from '../components/layout/sidebarConfig'
import { useWorkspace } from '../components/layout/useWorkspace'
import './MorePage.css'

const featurePages = [
  'Library / Procedures',
  'Requests',
  'Purchase Orders',
  'Parts Inventory',
  'Meters',
  'Vendors',
  'Reporting',
  'Chat',
]
const availableFeatures = sidebarGroups.flatMap((group) => group.items.flatMap((item) => [
  item,
  ...(item.children ?? []).map((child) => ({ ...child, icon: item.icon })),
]))
const featureItems = featurePages
  .map((page) => availableFeatures.find((item) => item.page === page))
  .filter(Boolean)
  .map((item) => item.page === 'Chat' ? { ...item, label: 'Tork', icon: Bot } : item)
const featureColors = ['blue', 'orange', 'cyan', 'pink', 'yellow', 'purple', 'green']

export function MorePage({ onNavigate }) {
  const workspace = useWorkspace()
  const organizationName = workspace.organization?.name || 'Workspace'

  return <main className="more-page" aria-labelledby="more-page-title">
    <h1 id="more-page-title" className="more-page-visually-hidden">More</h1>

    <button className="more-workspace-card" type="button" onClick={() => onNavigate('Settings / General')}>
      <span className="more-workspace-icon">
        {workspace.organization?.logo_url
          ? <img src={workspace.organization.logo_url} alt="" />
          : <Building2 size={30} aria-hidden="true" />}
      </span>
      <span className="more-workspace-copy">
        <span className="more-workspace-name">{organizationName}</span>
        <span className="more-workspace-settings">View Settings</span>
      </span>
      <ChevronRight className="more-workspace-chevron" size={23} aria-hidden="true" />
    </button>

    <div className="more-page-actions">
      <button className="more-page-action is-primary" type="button" onClick={() => onNavigate('Settings / Invite Users')}>
        <UserRoundPlus size={21} aria-hidden="true" />
        <span>Invite Members</span>
      </button>
      <button className="more-page-action is-secondary" type="button" onClick={() => onNavigate('Settings / Notification Settings')}>
        <BellOff size={20} aria-hidden="true" />
        <span>Notification Settings</span>
      </button>
    </div>

    <section className="more-features" aria-labelledby="more-features-heading">
      <h2 id="more-features-heading">Product Features</h2>
      <div className="more-feature-grid">
        {featureItems.map((item, index) => {
          const Icon = item.icon ?? Building2
          const color = featureColors[index % featureColors.length]
          return <button className="more-feature-card" key={item.page} type="button" onClick={() => onNavigate(item.page)}>
            <span className={`more-feature-icon is-${color}`}><Icon size={30} strokeWidth={2} aria-hidden="true" /></span>
            <span className="more-feature-label">{item.label}</span>
          </button>
        })}
      </div>
    </section>

    <BuildInformation />
  </main>
}

function BuildInformation() {
  const [buildInfo, setBuildInfo] = useState(import.meta.env.DEV
    ? { build: 'Build: local development', version: 'Development' }
    : null)

  useEffect(() => {
    if (import.meta.env.DEV) return undefined

    let active = true
    fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data) setBuildInfo({ build: data.build, version: data.version })
      })
      .catch(() => {})

    return () => { active = false }
  }, [])

  return <section className="more-build-information" aria-labelledby="more-build-heading">
    <h2 id="more-build-heading">Build Information</h2>
    {buildInfo
      ? <dl>
        <div><dt>Build</dt><dd>{buildInfo.build?.replace(/^Build:\s*/, '') || 'Unavailable'}</dd></div>
        <div><dt>Version</dt><dd>{buildInfo.version || 'Unavailable'}</dd></div>
      </dl>
      : <p>Loading build information…</p>}
  </section>
}
