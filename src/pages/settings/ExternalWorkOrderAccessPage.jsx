import { useState } from 'react'
import { ArrowLeft, Check, LockKeyhole } from 'lucide-react'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/useToast'
import { useWorkspace } from '../../components/layout/useWorkspace'
import { updateOrganization } from '../../services/organizationService'
import { getFeatureLabel } from '../../utils/featureLabels'
import { normalizeWorkOrderSettings } from '../../utils/workOrderSettings'
import './WorkOrderFeatureSettingsPage.css'

const expirationOptions = [
  { value: 'work_order_closed', label: 'The Work Order is closed' },
  { value: '1_day', label: '1 day' },
  { value: '2_days', label: '2 days' },
  { value: '3_days', label: '3 days' },
  { value: '4_days', label: '4 days' },
  { value: '5_days', label: '5 days' },
  { value: '7_days', label: '7 days' },
  { value: '30_days', label: '30 days' },
  { value: '90_days', label: '90 days' },
]

const accessFields = [
  { key: 'description', label: 'Description', options: ['hidden', 'view'] },
  { key: 'due_date', label: 'Due date', options: ['hidden', 'view'] },
  { key: 'priority', label: 'Priority', options: ['hidden', 'view'] },
  { key: 'asset', label: 'Asset', options: ['hidden', 'view'] },
  { key: 'location', label: 'Location', options: ['hidden', 'view'] },
  { key: 'custom_fields', label: 'Custom fields', options: ['hidden', 'view'] },
  { key: 'procedure', label: 'Procedure', options: ['hidden', 'view', 'interact'] },
  { key: 'comments', label: 'Comments', options: ['hidden', 'view', 'comment', 'interact'] },
  { key: 'attachments', label: 'Attachments', options: ['hidden', 'view'] },
]

const accessLabels = {
  hidden: 'Hidden',
  view: 'Can view',
  comment: 'Can view and comment',
  interact: 'Can view and interact',
}

export function ExternalWorkOrderAccessPage({ onNavigate }) {
  const workspace = useWorkspace()
  const organization = workspace.organization ?? {}
  const organizationId = organization.id
  const isOrganizationAdmin = organization.roleDefinition?.system_key === 'organization_admin' || ['owner', 'admin'].includes(organization.role)
  const workOrderLabel = getFeatureLabel(organization.feature_labels, 'workOrder')
  const [settings, setSettings] = useState(() => normalizeWorkOrderSettings(organization.work_order_settings))
  const [settingsOrganizationId, setSettingsOrganizationId] = useState(organizationId)
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')
  const { showToast } = useToast()
  const displayedSettings = settingsOrganizationId === organizationId ? settings : normalizeWorkOrderSettings(organization.work_order_settings)

  const saveSettings = async (key, value) => {
    if (!organizationId || !isOrganizationAdmin || savingKey) return
    const previous = displayedSettings
    const next = key.startsWith('externalWorkOrderAccess.')
      ? { ...previous, externalWorkOrderAccess: { ...previous.externalWorkOrderAccess, [key.split('.')[1]]: value } }
      : { ...previous, [key]: value }
    setSettings(next)
    setSettingsOrganizationId(organizationId)
    setSavingKey(key)
    setError('')
    try {
      await updateOrganization({ organizationId, updates: { work_order_settings: next } })
      workspace.patchOrganization?.(organizationId, { work_order_settings: next })
      showToast('External Work Order settings updated.')
    } catch (saveError) {
      setSettings(previous)
      setError(saveError.message || 'Unable to save External Work Order settings.')
      showToast(saveError.message || 'Unable to save External Work Order settings.', { tone: 'error' })
    } finally {
      setSavingKey('')
    }
  }

  return <div className="settings-page work-order-feature-page">
    <header className="settings-page-header"><div><p className="eyebrow">Organization Settings</p><h1>External {workOrderLabel}</h1><p>Choose what external contacts can access when a Work Order is shared.</p></div></header>
    <div className="work-order-feature-content work-order-external-access-page">
      <button type="button" className="work-order-feature-back" onClick={() => onNavigate('Settings / Features / Work Orders')}><ArrowLeft size={17} aria-hidden="true" /> Back to Work Order settings</button>
      {!isOrganizationAdmin && <p className="work-order-feature-readonly">Only organization administrators can change these settings.</p>}
      {error && <p className="work-order-feature-error" role="alert">{error}</p>}
      <section className="work-order-settings-card" aria-labelledby="external-work-order-access-title">
        <h2 id="external-work-order-access-title">Shared Link Expiration</h2>
        <p className="work-order-settings-card-description">Set a time limit for shared links to external Work Orders.</p>
        <div className="work-order-external-expiration-setting"><div><strong>Shared links expire after</strong><p>Links always become unavailable when the Work Order is closed.</p></div><Select ariaLabel="Shared links expire after" value={displayedSettings.externalWorkOrderLinkExpiration} onChange={(value) => void saveSettings('externalWorkOrderLinkExpiration', value)} disabled={!isOrganizationAdmin || Boolean(savingKey)} options={expirationOptions} /></div>
      </section>
      <section className="work-order-settings-card" aria-labelledby="external-work-order-default-access-title">
        <h2 id="external-work-order-default-access-title">Default External Work Order Access</h2>
        <p className="work-order-settings-card-description">By default, people you share links with have the following access.</p>
        <div className="work-order-external-access-list">{accessFields.map((field) => <div className="work-order-external-access-row" key={field.key}><div><span className="work-order-external-access-icon" aria-hidden="true"><Check size={15} /></span><strong>{field.label}</strong></div><Select ariaLabel={`${field.label} access`} value={displayedSettings.externalWorkOrderAccess[field.key]} onChange={(value) => void saveSettings(`externalWorkOrderAccess.${field.key}`, value)} disabled={!isOrganizationAdmin || Boolean(savingKey)} options={field.options.map((option) => ({ value: option, label: accessLabels[option] }))} /></div>)}</div>
      </section>
      <section className="work-order-settings-card" aria-labelledby="external-work-order-comment-identity-title">
        <h2 id="external-work-order-comment-identity-title">Comment identity</h2>
        <p className="work-order-settings-card-description">Choose whether external contacts can see the names of internal Workbench members who post comments.</p>
        <label className="work-order-external-identity-setting">
          <span><strong>Show internal comment author names</strong><small>When disabled, internal comments are labeled “Workbench team member.” External contact names are always shown.</small></span>
          <input aria-label="Show internal comment author names" type="checkbox" checked={Boolean(displayedSettings.externalWorkOrderAccess.showInternalCommentAuthors)} onChange={(event) => void saveSettings('externalWorkOrderAccess.showInternalCommentAuthors', event.target.checked)} disabled={!isOrganizationAdmin || Boolean(savingKey)} />
        </label>
        <label className="work-order-external-identity-setting">
          <span><strong>Require commenter name</strong><small>When disabled, external contacts may post comments without identifying themselves.</small></span>
          <input aria-label="Require commenter name" type="checkbox" checked={displayedSettings.externalWorkOrderAccess.requireCommenterName !== false} onChange={(event) => void saveSettings('externalWorkOrderAccess.requireCommenterName', event.target.checked)} disabled={!isOrganizationAdmin || Boolean(savingKey)} />
        </label>
        <label className="work-order-external-identity-setting">
          <span><strong>Require commenter email</strong><small>When enabled, external contacts must provide an email address before posting a comment.</small></span>
          <input aria-label="Require commenter email" type="checkbox" checked={Boolean(displayedSettings.externalWorkOrderAccess.requireCommenterEmail)} onChange={(event) => void saveSettings('externalWorkOrderAccess.requireCommenterEmail', event.target.checked)} disabled={!isOrganizationAdmin || Boolean(savingKey)} />
        </label>
      </section>
      <section className="work-order-settings-card work-order-external-security-note"><div><LockKeyhole size={18} aria-hidden="true" /><strong>External links are scoped to one Work Order</strong></div><p>External contacts never receive the Workbench sidebar, organization navigation, or access to other Work Orders.</p></section>
    </div>
  </div>
}

