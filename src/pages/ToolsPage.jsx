import { useEffect, useState } from 'react'
import { BellOff, Bot, Building2, ChevronRight, UserRoundPlus } from 'lucide-react'
import { sidebarGroups } from '../components/layout/sidebarConfig'
import { useWorkspace } from '../components/layout/useWorkspace'
import { MobileSettingsSheet } from '../components/ui/MobileSettingsSheet'
import { getFeatureLabel } from '../utils/featureLabels'
import { getFeatureModuleKeyForPage, isFeatureModuleEnabled } from '../utils/featureModules'
import './ToolsPage.css'

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

export function ToolsPage({ onNavigate }) {
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)
  const workspace = useWorkspace()
  const organizationName = workspace.organization?.name || 'Workspace'
  const featureModules = workspace.organization?.feature_modules
  const visibleFeatureItems = featureItems.filter((item) => isFeatureModuleEnabled(featureModules, getFeatureModuleKeyForPage(item.page)))
  const openSettings = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 840px)').matches) {
      setIsSettingsMenuOpen(true)
      return
    }
    onNavigate('Settings / General')
  }
  return <main className="tools-page" aria-labelledby="tools-page-title">
    <h1 id="tools-page-title" className="tools-page-visually-hidden">Tools</h1>

    <button className="tools-workspace-card" type="button" onClick={openSettings}>
      <span className="tools-workspace-icon">
        {workspace.organization?.logo_url
          ? <img src={workspace.organization.logo_url} alt="" />
          : <Building2 size={30} aria-hidden="true" />}
      </span>
      <span className="tools-workspace-copy">
        <span className="tools-workspace-name">{organizationName}</span>
        <span className="tools-workspace-settings">View Settings</span>
      </span>
      <ChevronRight className="tools-workspace-chevron" size={23} aria-hidden="true" />
    </button>

    {isSettingsMenuOpen && <MobileSettingsSheet onClose={() => setIsSettingsMenuOpen(false)} onNavigate={onNavigate} />}

    <div className="tools-page-actions">
      <button className="tools-page-action is-primary" type="button" onClick={() => onNavigate('Settings / Invite Users')}>
        <UserRoundPlus size={21} aria-hidden="true" />
        <span>Invite Members</span>
      </button>
      <button className="tools-page-action is-secondary" type="button" onClick={() => onNavigate('Settings / Notification Settings')}>
        <BellOff size={20} aria-hidden="true" />
        <span>Notification Settings</span>
      </button>
    </div>

    <section className="tools-features" aria-labelledby="tools-features-heading">
      <h2 id="tools-features-heading">Product Features</h2>
      <div className="tools-feature-grid">
        {visibleFeatureItems.map((item, index) => {
          const Icon = item.icon ?? Building2
          const color = featureColors[index % featureColors.length]
          return <button className="tools-feature-card" key={item.page} type="button" onClick={() => onNavigate(item.page)}>
            <span className={`tools-feature-icon is-${color}`}><Icon size={30} strokeWidth={2} aria-hidden="true" /></span>
            <span className="tools-feature-label">{item.featureLabelKey ? getFeatureLabel(workspace.organization?.feature_labels, item.featureLabelKey) : item.label}</span>
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

  return <section className="tools-build-information" aria-labelledby="tools-build-heading">
    <h2 id="tools-build-heading">Build Information</h2>
    {buildInfo
      ? <dl>
        <div><dt>Build</dt><dd>{buildInfo.build?.replace(/^Build:\s*/, '') || 'Unavailable'}</dd></div>
        <div><dt>Version</dt><dd>{buildInfo.version || 'Unavailable'}</dd></div>
      </dl>
      : <p>Loading build information…</p>}
  </section>
}
