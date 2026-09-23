import { useEffect, useMemo, useState } from 'react'
import { LockKeyhole, MoreVertical } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { DataTable } from '../components/ui/DataTable'
import { PanelLayout } from '../components/layout/PanelLayout'
import { useDismissibleMenu } from '../hooks/useDismissibleMenu'
import { getCurrentWorkspace } from '../services/workspaceService'
import { listOrganizationMembers, membershipRoles } from '../services/organizationService'
import { formatLastVisitForUser } from '../utils/dateFormatting'
import { PeopleTabs } from './people/PeopleTabs'
import './PeoplePage.css'

function formatLastVisit(lastSignInAt, dateFormat, timeZone, weekStart) {
  if (!lastSignInAt) return '—'
  return formatLastVisitForUser(lastSignInAt, { dateFormat, timeZone, weekStart })
}

function UserRowActions({ member, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useDismissibleMenu(isOpen, () => setIsOpen(false))
  const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(' ') || 'Unnamed user'

  return <div ref={rootRef} className="people-row-actions">
    <button type="button" className="people-row-action" aria-label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}><MoreVertical size={18} /></button>
    {isOpen && <div className="people-row-menu" role="menu" aria-label={`Actions for ${name}`}>
      <button type="button" role="menuitem" disabled className="people-row-menu-item"><span>Send Message</span><LockKeyhole size={14} aria-hidden="true" /></button>
      <button type="button" role="menuitem" className="people-row-menu-item" onClick={() => { setIsOpen(false); onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`) }}><span>See Account</span></button>
      <button type="button" role="menuitem" disabled className="people-row-menu-item"><span>Remove from Organization</span><LockKeyhole size={14} aria-hidden="true" /></button>
    </div>}
  </div>
}

function roleLabel(role) {
  return membershipRoles.find((option) => option.value === role)?.label ?? role ?? '—'
}

export function UsersPage({ onNavigate }) {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [timeZone, setTimeZone] = useState(undefined)
  const [weekStart, setWeekStart] = useState('Sunday')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getCurrentWorkspace()
      .then((workspace) => {
        setDateFormat(workspace.preferences?.date_format ?? 'MM/DD/YYYY')
        setTimeZone(workspace.preferences?.timezone || undefined)
        setWeekStart(workspace.preferences?.week_start ?? 'Sunday')
        return workspace.organization?.id ? listOrganizationMembers(workspace.organization.id) : []
      })
      .then(setMembers)
      .catch((loadError) => setError(loadError.message || 'Unable to load users.'))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return members
    return members.filter((member) => {
      const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(' ')
      return `${name} ${roleLabel(member.role)} ${member.status}`.toLowerCase().includes(query)
    })
  }, [members, search])

  const userColumns = [
    { key: 'name', label: 'Full Name', width: '28%', sortValue: (member) => [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(' ') || 'Unnamed user', render: (member) => { const firstName = member.profile?.first_name ?? ''; const lastName = member.profile?.last_name ?? ''; const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed user'; return <button type="button" className="people-user-cell people-user-link" onClick={() => onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`)}><Avatar src={member.profile?.avatar_url?.startsWith('http') ? member.profile.avatar_url : ''} firstName={firstName} lastName={lastName} alt="" /><span>{name}</span></button> } },
    { key: 'role', label: 'Role', width: '17%', sortValue: (member) => roleLabel(member.role), render: (member) => roleLabel(member.role) },
    { key: 'teams', label: 'Teams', width: '18%', sortable: false, render: () => '—' },
    { key: 'lastVisit', label: 'Last Visit', width: '17%', sortValue: (member) => member.last_sign_in_at ?? '', render: (member) => formatLastVisit(member.last_sign_in_at, dateFormat, timeZone, weekStart) },
    { key: 'quota', label: 'Work Quota', width: '17%', sortValue: () => '', render: () => '—' },
    { key: 'actions', label: '', width: '48px', sortable: false, render: (member) => <UserRowActions member={member} onNavigate={onNavigate} /> },
  ]

  return <PanelLayout title="Teams / Users" searchValue={search} onSearch={setSearch} searchPlaceholder="Search Users" actionLabel="Invite users" onAction={() => onNavigate('Settings / Invite Users')} showViewSelector={false} className="people-page users-page" bodyClassName="people-body" subnavigation={<PeopleTabs active="users" onNavigate={onNavigate} />}>
    {!isLoading && <section className="people-table-card" aria-label="Users">
      {error && <p className="people-state people-error" role="alert">{error}</p>}
      {!error && <DataTable ariaLabel="Users" columns={userColumns} rows={filteredMembers} rowKey={(member) => `${member.organization_id}-${member.user_id}`} initialSortKey="name" emptyState="No users found." />}
    </section>}
  </PanelLayout>
}
