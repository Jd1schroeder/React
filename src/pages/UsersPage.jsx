import { useEffect, useMemo, useState } from 'react'
import { UserRowActions } from '../components/people/UserRowActions'
import { UserLastVisitCell, UserNameCell } from '../components/people/UserTableCells'
import { DataTable } from '../components/ui/DataTable'
import { PanelLayout } from '../components/layout/PanelLayout'
import { getCurrentWorkspace } from '../services/workspaceService'
import { revokeOrganizationInvitation } from '../services/invitationService'
import { listOrganizationMembers, membershipRoles } from '../services/organizationService'
import { PeopleTabs } from './people/PeopleTabs'
import './PeoplePage.css'

function roleLabel(role, assignedRole) {
  if (assignedRole?.name) return assignedRole.name
  return membershipRoles.find((option) => option.value === role)?.label ?? role ?? '—'
}

function userName(member) {
  return [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(' ') || member.contact_value || 'Unnamed user'
}

export function UsersPage({ onNavigate }) {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [timeZone, setTimeZone] = useState(undefined)
  const [weekStart, setWeekStart] = useState('Sunday')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const revokeInvitation = async (member) => {
    if (!window.confirm(`Revoke the invitation for ${userName(member)}?`)) return
    try {
      await revokeOrganizationInvitation(member.invitation_id)
      setMembers((current) => current.filter((item) => item.invitation_id !== member.invitation_id))
    } catch (revokeError) {
      setError(revokeError.message || 'Unable to revoke the invitation.')
    }
  }

  useEffect(() => {
    getCurrentWorkspace()
      .then((workspace) => {
        setDateFormat(workspace.preferences?.date_format ?? 'MM/DD/YYYY')
        setTimeZone(workspace.preferences?.timezone || undefined)
        setWeekStart(workspace.preferences?.week_start ?? 'Sunday')
        return workspace.organization?.id ? listOrganizationMembers(workspace.organization.id, { includePendingInvitations: true }) : []
      })
      .then(setMembers)
      .catch((loadError) => setError(loadError.message || 'Unable to load users.'))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return members
    return members.filter((member) => `${userName(member)} ${member.email ?? ''} ${member.contact_value ?? ''} ${roleLabel(member.role, member.organization_roles)} ${member.status}`.toLowerCase().includes(query))
  }, [members, search])

  const userColumns = [
    { key: 'name', label: 'Full Name', width: '28%', sortValue: userName, render: (member) => <UserNameCell member={member} onNavigate={onNavigate} /> },
    { key: 'role', label: 'Role', width: '17%', sortValue: (member) => roleLabel(member.role, member.organization_roles), render: (member) => roleLabel(member.role, member.organization_roles) },
    { key: 'teams', label: 'Teams', width: '18%', sortable: false, render: () => '—' },
    { key: 'lastVisit', label: 'Last Visit', width: '17%', sortValue: (member) => member.last_sign_in_at ?? (member.invitation_id ? 'zzzz' : ''), render: (member) => <UserLastVisitCell member={member} dateFormat={dateFormat} timeZone={timeZone} weekStart={weekStart} /> },
    { key: 'quota', label: 'Work Quota', width: '17%', sortValue: () => '', render: () => '—' },
    { key: 'actions', label: '', width: '48px', sortable: false, render: (member) => <UserRowActions member={member} onNavigate={onNavigate} onRevoke={revokeInvitation} /> },
  ]

  return <PanelLayout title="Teams / Users" searchValue={search} onSearch={setSearch} searchPlaceholder="Search Users" actionLabel="Invite users" onAction={() => onNavigate('Settings / Invite Users')} showViewSelector={false} className="people-page users-page" bodyClassName="people-body" subnavigation={<PeopleTabs active="users" onNavigate={onNavigate} />}>
    {!isLoading && <section className="people-table-card" aria-label="Users">
      {error && <p className="people-state people-error" role="alert">{error}</p>}
      {!error && <DataTable ariaLabel="Users" columns={userColumns} rows={filteredMembers} rowKey={(member) => `${member.organization_id}-${member.user_id ?? member.invitation_id}`} initialSortKey="name" emptyState="No users found." />}
    </section>}
  </PanelLayout>
}
