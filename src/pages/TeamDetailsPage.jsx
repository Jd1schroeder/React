import { ArrowLeft, ChevronDown, LockKeyhole, MapPin, MoreVertical, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { useWorkspace } from '../components/layout/useWorkspace'
import { addOrganizationTeamMembers, deleteOrganizationTeam, getOrganizationTeamShell, listOrganizationMembers, removeOrganizationTeamMember, updateOrganizationTeamMemberRole } from '../services/organizationService'
import { UserLastVisitCell } from '../components/people/UserTableCells'
import './TeamDetailsPage.css'

export function TeamDetailsPage({ recordId, onNavigate, isTeamAddMembers = false }) {
  const workspace = useWorkspace()
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [organizationMembers, setOrganizationMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [memberMenuOpenId, setMemberMenuOpenId] = useState(null)
  const [memberToRemove, setMemberToRemove] = useState(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeletingTeam, setIsDeletingTeam] = useState(false)
  const [roleSavingId, setRoleSavingId] = useState(null)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(isTeamAddMembers)
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [isAddingMembers, setIsAddingMembers] = useState(false)

  useEffect(() => {
    if (!isMenuOpen && !memberMenuOpenId) return undefined
    const dismissMenus = (event) => {
      if (isMenuOpen && !event.target.closest('.team-details-menu-wrap')) setIsMenuOpen(false)
      if (memberMenuOpenId && !event.target.closest('.team-member-actions')) setMemberMenuOpenId(null)
    }
    document.addEventListener('pointerdown', dismissMenus)
    return () => document.removeEventListener('pointerdown', dismissMenus)
  }, [isMenuOpen, memberMenuOpenId])

  useEffect(() => {
    if (!isDeleteConfirmOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeletingTeam) setIsDeleteConfirmOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDeleteConfirmOpen, isDeletingTeam])

  useEffect(() => {
    const organizationId = workspace.organization?.id
    if (!organizationId || !recordId) return undefined
    getOrganizationTeamShell(organizationId, recordId)
      .then((selectedTeam) => {
        setTeam(selectedTeam)
        setIsLoading(false)
        if (!selectedTeam) return null
        return listOrganizationMembers(organizationId, isTeamAddMembers ? {} : { userIds: selectedTeam.memberIds })
          .then((organizationMembers) => {
            setOrganizationMembers(organizationMembers)
            setMembers(organizationMembers.map((member) => ({ ...member, teamRole: selectedTeam.memberRoles?.[member.user_id] ?? (member.user_id === selectedTeam.created_by ? 'admin' : 'member') })))
          })
      })
      .catch((loadError) => setError(loadError.message || 'Unable to load this team.'))
      .finally(() => setIsLoading(false))
  }, [isTeamAddMembers, recordId, workspace.organization?.id])

  const administratorId = team?.created_by
  const sortedMembers = useMemo(() => [...members].sort((left, right) => (left.user_id === administratorId ? -1 : right.user_id === administratorId ? 1 : 0)), [administratorId, members])
  const visibleMembers = showAllMembers ? sortedMembers : sortedMembers.slice(0, 3)
  const memberName = (member) => [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(' ') || member.contact_value || 'Unnamed user'
  const availableMembers = useMemo(() => {
    const currentIds = new Set(team?.memberIds ?? [])
    const query = memberSearch.trim().toLowerCase()
    return organizationMembers
      .filter((member) => member.user_id && !currentIds.has(member.user_id))
      .filter((member) => !query || memberName(member).toLowerCase().includes(query) || (member.email ?? '').toLowerCase().includes(query))
  }, [memberSearch, organizationMembers, team?.memberIds])
  const selectedMembers = useMemo(() => organizationMembers.filter((member) => selectedMemberIds.includes(member.user_id)), [organizationMembers, selectedMemberIds])
  const addMembers = async () => {
    if (!selectedMemberIds.length) return
    setIsAddingMembers(true)
    setError('')
    try {
      await addOrganizationTeamMembers({ organizationId: workspace.organization.id, teamId: recordId, userIds: selectedMemberIds })
      setIsAddMembersOpen(false)
      onNavigate(`/teams/${encodeURIComponent(recordId)}`)
    } catch (addError) {
      setError(addError.message || 'Unable to add members to this team.')
      setIsAddingMembers(false)
    }
  }
  const deleteTeam = () => {
    setIsMenuOpen(false)
    setIsDeleteConfirmOpen(true)
  }
  const confirmDeleteTeam = async () => {
    setIsDeletingTeam(true)
    setError('')
    try {
      await deleteOrganizationTeam({ organizationId: workspace.organization.id, teamId: team.id })
      onNavigate('/teams')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this team.')
      setIsDeletingTeam(false)
    }
  }
  const removeMember = async (member) => {
    setIsRemovingMember(true)
    try {
      await removeOrganizationTeamMember({ organizationId: workspace.organization.id, teamId: team.id, userId: member.user_id })
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id))
      setTeam((current) => ({ ...current, memberIds: current.memberIds.filter((id) => id !== member.user_id), memberCount: Math.max(0, (current.memberCount ?? members.length) - 1) }))
      setMemberMenuOpenId(null)
      setMemberToRemove(null)
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove this member from the team.')
    } finally {
      setIsRemovingMember(false)
    }
  }
  const updateMemberRole = async (member, role) => {
    setRoleSavingId(member.user_id)
    setError('')
    try {
      await updateOrganizationTeamMemberRole({ organizationId: workspace.organization.id, teamId: team.id, userId: member.user_id, role })
      setMembers((current) => current.map((item) => item.user_id === member.user_id ? { ...item, teamRole: role } : item))
      setTeam((current) => ({ ...current, memberRoles: { ...(current.memberRoles ?? {}), [member.user_id]: role } }))
    } catch (roleError) {
      setError(roleError.message || 'Unable to update this member role.')
    } finally {
      setRoleSavingId(null)
    }
  }

  if (isLoading) return <main className="team-details-page"><p className="team-details-state">Loading team...</p></main>
  if (error || !team) return <main className="team-details-page"><p className="team-details-state team-details-error" role="alert">{error || 'Team not found.'}</p></main>

  return <main className="team-details-page"><header className="team-details-header"><button type="button" className="team-details-back" onClick={() => onNavigate('/teams')} aria-label="Back to teams"><ArrowLeft size={20} /></button><h1>{team.name}</h1></header><section className="team-details-card">
    <div className="team-details-summary"><span className="team-details-avatar" style={{ backgroundColor: team.color || 'var(--blue)' }}>{team.name.slice(0, 1).toUpperCase()}</span><div className="team-details-description">{team.description ? <p className="team-details-description-text">{team.description}</p> : <><p>What’s this Team responsible for?</p><button type="button" disabled><LockKeyhole size={13} /> Add a description</button></>}</div><div className="team-details-menu-wrap"><button type="button" className="team-details-more" aria-expanded={isMenuOpen} aria-label="Team actions" onClick={() => setIsMenuOpen((current) => !current)}><MoreVertical size={20} /></button>{isMenuOpen && <div className="team-details-menu" role="menu" aria-label="Team actions"><button type="button" role="menuitem" onClick={() => onNavigate(`/teams/${encodeURIComponent(team.id)}/edit`)}>Edit Details</button><button type="button" role="menuitem" className="is-danger" onClick={deleteTeam}>Delete</button></div>}</div></div>
    <div className="team-details-divider" />
    <section className="team-details-members" aria-labelledby="team-members-title"><div className="team-details-section-heading"><h2 id="team-members-title">Members ({members.length})</h2><Button onClick={() => onNavigate(`/teams/${encodeURIComponent(recordId)}/addmembers`)}><UsersRound size={15} /> Add Members</Button></div><div className="team-members-table"><div className="team-member-row team-member-heading"><span>Full Name</span><span>Role</span><span>Last Visit</span><span /></div>{visibleMembers.map((member) => <div className="team-member-row" key={member.user_id}><span className="team-member-name"><Avatar src={member.profile?.avatar_url?.startsWith('http') ? member.profile.avatar_url : ''} firstName={member.profile?.first_name} lastName={member.profile?.last_name} alt="" />{memberName(member)}</span><span className="team-member-role-cell"><Select className="team-member-role-select" value={member.teamRole ?? 'member'} onChange={(role) => updateMemberRole(member, role)} disabled={roleSavingId === member.user_id} ariaLabel={`Role for ${memberName(member)}`} options={[{ value: 'admin', label: 'Team Administrator' }, { value: 'member', label: 'Member' }]} /></span><UserLastVisitCell member={member} dateFormat={workspace.preferences?.date_format} timeZone={workspace.preferences?.timezone} weekStart={workspace.preferences?.week_start} /><div className="team-member-actions"><button type="button" className="team-member-more" aria-expanded={memberMenuOpenId === member.user_id} aria-label={`Actions for ${memberName(member)}`} onClick={() => setMemberMenuOpenId((current) => current === member.user_id ? null : member.user_id)}><MoreVertical size={18} /></button>{memberMenuOpenId === member.user_id && <div className="team-member-menu" role="menu" aria-label={`${memberName(member)} actions`}><button type="button" role="menuitem" className="is-disabled" disabled><span>Send Message</span><LockKeyhole size={15} /></button><button type="button" role="menuitem" onClick={() => onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`)}>See Account</button><button type="button" role="menuitem" className="is-danger" onClick={() => setMemberToRemove(member)}>Remove from Team</button></div>}</div></div>)}</div>{sortedMembers.length > 3 && <button type="button" className="team-see-all-members" onClick={() => setShowAllMembers((current) => !current)}>{showAllMembers ? 'Show fewer Members' : 'See all Members'}<ChevronDown size={16} className={showAllMembers ? 'is-open' : ''} /></button>}</section>
    <div className="team-details-related"><section><h2>Locations (0)</h2><p><MapPin size={16} /> No locations assigned.</p><button type="button" disabled><LockKeyhole size={13} /> Assign locations to the Team</button></section><section><h2>Assets (0)</h2><p><UsersRound size={16} /> No assets assigned.</p><button type="button" disabled><LockKeyhole size={13} /> Assign assets to the Team</button></section></div>
  </section>{isAddMembersOpen && <div className="team-add-members-page"><div className="team-add-members-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isAddingMembers) { setIsAddMembersOpen(false); onNavigate(`/teams/${encodeURIComponent(recordId)}`) } }}><section className="team-add-members-modal" role="dialog" aria-modal="true" aria-labelledby="team-add-members-title"><header><h2 id="team-add-members-title">Add Members to the Team</h2><button type="button" onClick={() => { setIsAddMembersOpen(false); onNavigate(`/teams/${encodeURIComponent(recordId)}`) }} aria-label="Close"><X size={20} /></button></header><div className="team-add-members-content"><label htmlFor="team-member-picker">Add Members to the Team</label><div className="team-member-picker"><div className="team-member-selection">{selectedMembers.map((member) => <span className="team-member-chip" key={member.user_id}>{memberName(member)}<button type="button" aria-label={`Remove ${memberName(member)}`} onClick={() => setSelectedMemberIds((current) => current.filter((id) => id !== member.user_id))}><X size={13} /></button></span>)}<input id="team-member-picker" role="combobox" aria-expanded={isMemberPickerOpen} aria-controls="team-member-options" aria-autocomplete="list" value={memberSearch} onFocus={() => setIsMemberPickerOpen(true)} onChange={(event) => { setMemberSearch(event.target.value); setIsMemberPickerOpen(true) }} placeholder={selectedMembers.length ? '' : 'Start typing...'} /></div><button type="button" aria-label="Show available members" onClick={() => setIsMemberPickerOpen((current) => !current)}><ChevronDown size={18} /></button>{isMemberPickerOpen && <div id="team-member-options" className="team-member-options" role="listbox" aria-multiselectable="true">{availableMembers.length ? availableMembers.map((member) => <button type="button" role="option" aria-selected={selectedMemberIds.includes(member.user_id)} key={member.user_id} onClick={() => setSelectedMemberIds((current) => current.includes(member.user_id) ? current.filter((id) => id !== member.user_id) : [...current, member.user_id])}>{memberName(member)}</button>) : <p>No available members.</p>}</div>}</div>{selectedMemberIds.length > 0 && <p className="team-selected-member-count">{selectedMemberIds.length} member{selectedMemberIds.length === 1 ? '' : 's'} selected</p>}{error && <p className="team-details-error" role="alert">{error}</p>}</div><footer><button type="button" onClick={() => { setIsAddMembersOpen(false); onNavigate(`/teams/${encodeURIComponent(recordId)}`) }} disabled={isAddingMembers}>Cancel</button><Button onClick={addMembers} disabled={!selectedMemberIds.length || isAddingMembers}>{isAddingMembers ? 'Adding...' : 'Add Members'}</Button></footer></section></div></div>}{memberToRemove && <div className="team-remove-member-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isRemovingMember) setMemberToRemove(null) }}><section className="team-remove-member-dialog" role="alertdialog" aria-modal="true" aria-labelledby="team-remove-member-title" aria-describedby="team-remove-member-description"><h2 id="team-remove-member-title">Remove member?</h2><p id="team-remove-member-description">Are you sure you want to remove {memberName(memberToRemove)} from {team.name}? They will no longer be a member of this team.</p><footer><button type="button" onClick={() => setMemberToRemove(null)} disabled={isRemovingMember}>Cancel</button><Button className="team-remove-member-confirm" onClick={() => removeMember(memberToRemove)} disabled={isRemovingMember}>{isRemovingMember ? 'Removing...' : 'Remove from Team'}</Button></footer></section></div>}{isDeleteConfirmOpen && <div className="team-delete-confirmation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletingTeam) setIsDeleteConfirmOpen(false) }}><section className="team-delete-confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-team-title" aria-describedby="delete-team-description"><div className="team-delete-confirmation-body"><h3 id="delete-team-title">Delete Team</h3><p id="delete-team-description">Are you sure you want to delete “{team.name}”?</p></div><div className="team-delete-confirmation-actions"><button type="button" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeletingTeam}>Cancel</button><button type="button" className="is-danger" onClick={() => { void confirmDeleteTeam() }} disabled={isDeletingTeam}>{isDeletingTeam ? 'Deleting...' : 'Delete'}</button></div></section></div>}</main>
}
