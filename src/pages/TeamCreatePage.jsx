import { Camera, Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWorkspace } from '../components/layout/useWorkspace'
import { createOrganizationTeam, listOrganizationTeams, updateOrganizationTeam } from '../services/organizationService'
import './TeamCreatePage.css'

const teamColors = ['#1887fc', '#0dbf98', '#ff9f1c', '#ff4146', '#3bc4bc', '#ff3e79', '#7c5ce6', '#ff735f']
const escalationOptions = [
  ['work_order_overdue', 'Work Order Overdue'],
  ['part_transfer_request', 'Part Transfer Request'],
  ['procedure_failure', 'Procedure Failures & Flags'],
  ['critical_parts', 'Critical Parts'],
]

export function TeamCreatePage({ onNavigate, recordId }) {
  const workspace = useWorkspace()
  const isEditing = Boolean(recordId)
  const [form, setForm] = useState({ name: '', description: '', color: teamColors[0], escalationEvents: [] })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing || !workspace.organization?.id) return undefined
    listOrganizationTeams(workspace.organization.id)
      .then((teams) => {
        const team = teams.find((item) => item.id === recordId)
        if (!team) throw new Error('Team not found.')
        setForm({ name: team.name, description: team.description ?? '', color: team.color || teamColors[0], escalationEvents: team.escalation_events ?? [] })
      })
      .catch((loadError) => setError(loadError.message || 'Unable to load this team.'))
    return undefined
  }, [isEditing, recordId, workspace.organization?.id])

  const updateForm = (updates) => setForm((current) => ({ ...current, ...updates }))
  const toggleEscalation = (eventKey) => updateForm({ escalationEvents: form.escalationEvents.includes(eventKey) ? form.escalationEvents.filter((item) => item !== eventKey) : [...form.escalationEvents, eventKey] })

  const save = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const payload = { organizationId: workspace.organization.id, name: form.name, description: form.description, color: form.color, isEscalationTeam: form.escalationEvents.length > 0, escalationEvents: form.escalationEvents }
      if (isEditing) await updateOrganizationTeam({ ...payload, teamId: recordId })
      else await createOrganizationTeam(payload)
      onNavigate(isEditing ? `/teams/${encodeURIComponent(recordId)}` : '/teams')
    } catch (saveError) {
      setError(saveError.message || 'Unable to create this team.')
    } finally {
      setIsSaving(false)
    }
  }

  return <div className="team-create-page"><div className="team-create-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onNavigate(isEditing ? `/teams/${encodeURIComponent(recordId)}` : '/teams') }}><section className="team-create-modal" role="dialog" aria-modal="true" aria-labelledby="team-create-title">
    <header className="team-create-header"><h1 id="team-create-title">{isEditing ? 'Edit Team' : 'New Team'}</h1><button type="button" className="team-create-close" onClick={() => onNavigate(isEditing ? `/teams/${encodeURIComponent(recordId)}` : '/teams')} aria-label="Close"><X size={20} /></button></header>
    <form onSubmit={save}>
      <div className="team-create-content">
        <div className="team-icon-preview" aria-hidden="true"><Camera size={22} /><span>+</span></div>
        <label className="team-create-field"><span>Team Name <em>(Required)</em></span><input autoFocus value={form.name} onChange={(event) => updateForm({ name: event.target.value })} placeholder="Enter Team Name" required maxLength={120} /></label>
        <label className="team-create-field"><span>Description</span><textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} placeholder="What’s this group about?" maxLength={240} /></label>
        <fieldset className="team-color-field"><legend>Team Color</legend><div className="team-color-options">{teamColors.map((color) => <button key={color} type="button" className={form.color === color ? 'is-selected' : ''} style={{ '--team-color': color }} onClick={() => updateForm({ color })} aria-label={`Choose ${color} team color`} aria-pressed={form.color === color}>{form.color === color && <Check size={15} />}</button>)}</div></fieldset>
        <fieldset className="team-escalation-field"><legend>Set as Escalation Team</legend><p>Should this team be automatically notified about certain events?</p>{escalationOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={form.escalationEvents.includes(value)} onChange={() => toggleEscalation(value)} /><span>{label}</span></label>)}</fieldset>
        {error && <p className="team-create-error" role="alert">{error}</p>}
      </div>
      <footer className="team-create-footer"><button type="button" className="team-create-cancel" onClick={() => onNavigate(isEditing ? `/teams/${encodeURIComponent(recordId)}` : '/teams')} disabled={isSaving}>Cancel</button><button type="submit" className="team-create-submit" disabled={isSaving || !form.name.trim()}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Team'}</button></footer>
    </form>
  </section></div></div>
}
