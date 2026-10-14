export function getPostAuthenticationPage() {
  if (window.sessionStorage.getItem('workbench.pendingInviteToken')) return 'Accept Invite'
  return window.innerWidth <= 840 ? 'Dashboard' : 'Work Orders'
}
