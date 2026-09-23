import { useEffect, useState } from 'react'
import { ArrowLeft, Clock3, LockKeyhole, MessageSquare, ShieldCheck, UserRound } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { getCurrentWorkspace } from '../services/workspaceService'
import { listOrganizationMembers, membershipRoles } from '../services/organizationService'
import { formatLastVisitForUser } from '../utils/dateFormatting'
import './UserProfilePage.css'

function roleLabel(role) {
  return membershipRoles.find((option) => option.value === role)?.label ?? role ?? 'Not available'
}

function formatLastVisit(lastSignInAt, dateFormat, timeZone, weekStart) {
  if (!lastSignInAt) return 'Not available'
  return formatLastVisitForUser(lastSignInAt, { dateFormat, timeZone, weekStart })
}

function valueOrUnavailable(value) {
  return value || 'Not available'
}

export function UserProfilePage({ userId, onNavigate }) {
  const [user, setUser] = useState(null)
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [timeZone, setTimeZone] = useState(undefined)
  const [weekStart, setWeekStart] = useState('Sunday')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getCurrentWorkspace()
      .then(async (workspace) => {
        if (!workspace.organization?.id) return null
        setDateFormat(workspace.preferences?.date_format ?? 'MM/DD/YYYY')
        setTimeZone(workspace.preferences?.timezone || undefined)
        setWeekStart(workspace.preferences?.week_start ?? 'Sunday')
        const members = await listOrganizationMembers(workspace.organization.id)
        const member = members.find((item) => item.user_id === userId)
        if (!member) return null
        return { ...member, email: workspace.user?.id === userId ? workspace.user.email : null }
      })
      .then((member) => { if (active) setUser(member) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load this user.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [userId])

  const firstName = user?.profile?.first_name ?? ''
  const lastName = user?.profile?.last_name ?? ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'User profile'

  return <main className="user-profile-page">
    <header className="user-profile-header">
      <button type="button" className="user-profile-back" onClick={() => onNavigate('/users')} aria-label="Back to users"><ArrowLeft size={20} /></button>
      <h1>Manage User</h1>
    </header>

    {isLoading && <p className="user-profile-state">Loading user profile…</p>}
    {!isLoading && error && <p className="user-profile-state user-profile-error" role="alert">{error}</p>}
    {!isLoading && !error && !user && <p className="user-profile-state">User profile not found.</p>}
    {!isLoading && !error && user && <div className="user-profile-layout">
      <div className="user-profile-left-column">
        <section className="user-profile-card user-summary-card" aria-labelledby="user-summary-title">
          <div className="user-summary-header">
            <Avatar src={user.profile?.avatar_url?.startsWith('http') ? user.profile.avatar_url : ''} firstName={firstName} lastName={lastName} alt={displayName} className="user-summary-avatar" />
            <div><h2 id="user-summary-title">{displayName}</h2><p>{roleLabel(user.role)}</p><div className="user-team-empty">No teams assigned</div></div>
          </div>
          <dl className="user-summary-details">
            <div><dt>Email</dt><dd>{valueOrUnavailable(user.email)}</dd></div>
            <div><dt>Phone Number</dt><dd>{valueOrUnavailable(user.profile?.phone)}</dd></div>
            <div><dt>Last Visit</dt><dd>{formatLastVisit(user.last_sign_in_at, dateFormat, timeZone, weekStart)}</dd></div>
            <div><dt>Authentication Type</dt><dd>Not available</dd></div>
            <div><dt>Work Orders Assigned</dt><dd>Not available</dd></div>
            <div><dt>% Completed</dt><dd>Not available</dd></div>
          </dl>
        </section>

        <section className="user-profile-card user-action-card" aria-label="User actions">
          {['Send Message', 'Edit Account', 'Edit PIN for Workstation Mode', 'Edit Role/Permissions', 'Remove from Organization'].map((label) => <button key={label} type="button" className={label === 'Remove from Organization' ? 'user-action-row user-action-danger' : 'user-action-row'} disabled><span>{label}</span><LockKeyhole size={15} aria-hidden="true" /></button>)}
        </section>
      </div>

      <div className="user-profile-right-column">
        <section className="user-profile-card user-activity-card" aria-labelledby="recent-activity-title">
          <div className="user-profile-tabs"><button type="button" className="is-active" disabled>Recent Activity</button><button type="button" disabled>Work Order History</button></div>
          <div className="user-profile-section-heading"><h2 id="recent-activity-title">Recent Activity</h2><div className="user-profile-toggle-summary"><MessageSquare size={16} /> Show Comments <Clock3 size={16} /> Show All Updates</div></div>
          <div className="user-profile-empty"><Clock3 size={30} aria-hidden="true" /><p>No recent activity available.</p></div>
        </section>

        <section className="user-profile-card user-permissions-card" aria-labelledby="user-permissions-title">
          <div className="user-profile-section-heading"><h2 id="user-permissions-title">User Permissions</h2><ShieldCheck size={20} aria-hidden="true" /></div>
          <div className="user-profile-empty"><UserRound size={30} aria-hidden="true" /><p>Permissions will appear here when the permission model is connected.</p></div>
        </section>
      </div>
    </div>}
  </main>
}
