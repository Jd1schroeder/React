import { createClient } from '@supabase/supabase-js'

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Keep local development same-origin so browser/device-emulation preflights do
// not block the authenticated Data API requests. Production uses the hosted URL.
const supabaseUrl = import.meta.env.DEV
  ? `${globalThis.location?.origin ?? configuredSupabaseUrl}/supabase`
  : configuredSupabaseUrl

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    experimental: { passkey: true },
  },
})
