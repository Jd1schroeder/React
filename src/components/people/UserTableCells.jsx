import { Avatar } from '../ui/Avatar'
import { formatLastVisitForUser } from '../../utils/dateFormatting'

export function UserNameCell({ member, onNavigate }) {
  const firstName = member.profile?.first_name ?? ''
  const lastName = member.profile?.last_name ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ') || member.contact_value || 'Unnamed user'
  const content = <><Avatar src={member.profile?.avatar_url?.startsWith('http') ? member.profile.avatar_url : ''} firstName={firstName} lastName={lastName} alt="" /><span>{name}</span></>
  if (!member.user_id) return <div className="people-user-cell">{content}</div>
  return <button type="button" className="people-user-cell people-user-link" onClick={() => onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`)}>{content}</button>
}

export function UserLastVisitCell({ member, dateFormat, timeZone, weekStart }) {
  if (member.invitation_id) return <span className="people-pending-visit">Invited</span>
  if (!member.last_sign_in_at) return '—'
  return formatLastVisitForUser(member.last_sign_in_at, { dateFormat, timeZone, weekStart })
}
