import { describe, expect, it } from 'vitest'
import { getFunctionErrorMessage, normalizeContactValue } from '../src/services/invitationUtils'

describe('invitation utilities', () => {
  it('normalizes pasted Markdown email links and quoted contact values', () => {
    expect(normalizeContactValue('[invitee@example.com](mailto:invitee@example.com)')).toBe('invitee@example.com')
    expect(normalizeContactValue('"invitee@example.com"')).toBe('invitee@example.com')
    expect(normalizeContactValue(' +1 419 555 1212 ')).toBe('+1 419 555 1212')
  })

  it('returns the Edge Function response error when available', async () => {
    const error = { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify({ error: 'Email address is invalid' })) }
    await expect(getFunctionErrorMessage(error)).resolves.toBe('Email address is invalid')
  })

  it('falls back to the SDK error when no response body is available', async () => {
    await expect(getFunctionErrorMessage({ message: 'Request failed' })).resolves.toBe('Request failed')
  })
})
