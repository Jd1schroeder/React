import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserProfilePage } from '../src/pages/UserProfilePage'
import { getCurrentWorkspace } from '../src/services/workspaceService'
import { getOrganizationMemberProfile, listOrganizationRolePermissions } from '../src/services/organizationService'

vi.mock('../src/services/workspaceService', () => ({
  getCurrentWorkspace: vi.fn(),
}))

vi.mock('../src/services/organizationService', () => ({
  getOrganizationMemberProfile: vi.fn(),
  listOrganizationRolePermissions: vi.fn(),
  membershipRoles: [{ value: 'member', label: 'Member' }],
}))

describe('UserProfilePage pending invitations', () => {
  it('shows the invitation email and Invited last visit state', async () => {
    getCurrentWorkspace.mockResolvedValue({ organization: { id: 'organization-a' }, preferences: {} })
    getOrganizationMemberProfile.mockResolvedValue({
      user_id: 'user-invited',
      invitation_id: 'invitation-a',
      role: 'member',
      email: 'invitee@example.com',
      profile: { first_name: 'Invited', last_name: 'User', phone: null, avatar_url: null },
    })
    listOrganizationRolePermissions.mockResolvedValue([])

    render(<UserProfilePage userId="user-invited" onNavigate={vi.fn()} />)

    expect(await screen.findByText('invitee@example.com')).toBeInTheDocument()
    expect(screen.getByText('Invited')).toBeInTheDocument()
  })
})
