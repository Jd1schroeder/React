import { describe, expect, it } from 'vitest'
import { authenticatedRoutes, publicRoutes, recordPageNames, recordRoutes } from '../src/routes/routeConfig'

describe('route configuration', () => {
  it('keeps authentication and legal pages outside the workspace shell', () => {
    expect(publicRoutes).toEqual(expect.arrayContaining([
      ['/', 'Splash'],
      ['/login', 'Login'],
      ['/signup', 'Signup'],
      ['/accept-invite', 'Accept Invite'],
      ['/external/work-orders/:shareToken', 'External Work Order'],
    ]))
    expect(authenticatedRoutes).toEqual(expect.arrayContaining([
      expect.objectContaining({ page: 'Work Orders' }),
      expect.objectContaining({ page: 'Dashboard' }),
    ]))
    expect(authenticatedRoutes.some(({ page }) => publicRoutes.some(([, publicPage]) => publicPage === page))).toBe(false)
  })

  it('keeps record URL segments paired with their detail page names', () => {
    expect(recordRoutes).toContain('workorders')
    expect(recordRoutes).toContain('assets')
    expect(recordPageNames.workorders).toBe('Work Orders')
    expect(recordPageNames.assets).toBe('Assets')
    expect(Object.keys(recordPageNames)).toEqual(expect.arrayContaining(recordRoutes))
  })
})
