import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsersPage } from '../src/pages/UsersPage'
import { getCurrentWorkspace } from '../src/services/workspaceService'
import { listOrganizationMembers } from '../src/services/organizationService'
import { revokeOrganizationInvitation } from '../src/services/invitationService'

vi.mock('../src/services/workspaceService', () => ({
  getCurrentWorkspace: vi.fn(),
}))

vi.mock('../src/services/organizationService', () => ({
  listOrganizationMembers: vi.fn(),
  membershipRoles: [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Administrator' },
  ],
}))

vi.mock('../src/services/invitationService', () => ({
  revokeOrganizationInvitation: vi.fn(),
}))

const workspace = {
  organization: { id: 'organization-a' },
  preferences: { date_format: 'MM/DD/YYYY', week_start: 'Sunday' },
}

const provisionedInvite = {
  organization_id: 'organization-a',
  user_id: 'user-invited',
  invitation_id: 'invitation-a',
  role: 'member',
  status: 'invited',
  email: 'invitee@example.com',
  profile: { first_name: 'Invited', last_name: 'User', avatar_url: null },
  last_sign_in_at: null,
}

const legacyInvite = {
  organization_id: 'organization-a',
  user_id: null,
  invitation_id: 'invitation-phone',
  role: 'member',
  status: 'invited',
  contact_value: '+14195551212',
  profile: { first_name: 'Phone', last_name: 'Invite', avatar_url: null },
  last_sign_in_at: null,
}

describe('UsersPage invitations and profile navigation', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    getCurrentWorkspace.mockResolvedValue(workspace)
    listOrganizationMembers.mockResolvedValue([provisionedInvite])
    revokeOrganizationInvitation.mockResolvedValue({ status: 'revoked' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('links a provisioned invited user from the full name cell and shows Invited', async () => {
    const onNavigate = vi.fn()
    render(<UsersPage onNavigate={onNavigate} />)

    const name = await screen.findByText('Invited User')
    expect(screen.getByText('Invited')).toBeInTheDocument()

    fireEvent.click(name.closest('button'))
    expect(onNavigate).toHaveBeenCalledWith('/users/profile/user-invited')
  })

  it('keeps legacy phone invitations without an account link', async () => {
    listOrganizationMembers.mockResolvedValue([legacyInvite])
    render(<UsersPage onNavigate={vi.fn()} />)

    expect(await screen.findByText('Phone Invite')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Phone Invite' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Phone Invite' }))
    expect(screen.getByRole('menuitem', { name: /See Account/ })).toBeDisabled()
  })

  it('revokes a pending invitation from the row menu', async () => {
    render(<UsersPage onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Invited User' }))
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Revoke invitation' }))

    await waitFor(() => expect(revokeOrganizationInvitation).toHaveBeenCalledWith('invitation-a'))
  })
})
