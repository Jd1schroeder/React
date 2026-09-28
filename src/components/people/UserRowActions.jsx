import { useState } from 'react'
import { LockKeyhole, MoreVertical, UserRoundX } from 'lucide-react'
import { useDismissibleMenu } from '../../hooks/useDismissibleMenu'

function ProfileAction({ member, onNavigate, onClose }) {
  if (!member.user_id) {
    return <button type="button" role="menuitem" disabled className="people-row-menu-item"><span>See Account</span><LockKeyhole size={14} aria-hidden="true" /></button>
  }
  return <button type="button" role="menuitem" className="people-row-menu-item" onClick={() => { onClose(); onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`) }}><span>See Account</span></button>
}

export function UserRowActions({ member, onNavigate, onRevoke }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useDismissibleMenu(isOpen, () => setIsOpen(false))
  const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(' ') || 'Unnamed user'
  const close = () => setIsOpen(false)

  return <div ref={rootRef} className="people-row-actions">
    <button type="button" className="people-row-action" aria-label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}><MoreVertical size={18} /></button>
    {isOpen && <div className="people-row-menu" role="menu" aria-label={`Actions for ${name}`}>
      <button type="button" role="menuitem" disabled className="people-row-menu-item"><span>Send Message</span><LockKeyhole size={14} aria-hidden="true" /></button>
      <ProfileAction member={member} onNavigate={onNavigate} onClose={close} />
      {member.invitation_id
        ? <button type="button" role="menuitem" className="people-row-menu-item people-row-menu-danger" onClick={() => { close(); onRevoke(member) }}><span>Revoke invitation</span><UserRoundX size={14} aria-hidden="true" /></button>
        : <button type="button" role="menuitem" disabled className="people-row-menu-item"><span>Remove from Organization</span><LockKeyhole size={14} aria-hidden="true" /></button>}
    </div>}
  </div>
}
