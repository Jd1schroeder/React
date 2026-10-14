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
    expect(manifest.background_color).toBe(manifest.theme_color)
  })
})
