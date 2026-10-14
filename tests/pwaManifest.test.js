import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const manifestPath = resolve(globalThis.process.cwd(), 'public/manifest.webmanifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

describe('PWA manifest', () => {
  it('starts the installed app on the login page', () => {
    expect(manifest.id).toBe('/')
    expect(manifest.start_url).toBe('/login')
    expect(manifest.scope).toBe('/')
    expect(manifest.background_color).toBe('#ffffff')
    expect(manifest.description).toContain('manage assets')
    expect(manifest.prefer_related_applications).toBe(false)
    expect(manifest.categories).toEqual(expect.arrayContaining(['business', 'productivity']))
    expect(manifest.shortcuts).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Work Orders', url: '/workorders' }),
      expect.objectContaining({ name: 'New Work Order', url: '/workorders?create=1' }),
    ]))
  })
})
