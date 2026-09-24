import { fileTypeFromBuffer } from 'npm:file-type@19.6.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const maxBytes = 5 * 1024 * 1024
const allowedTypes = new Map([
  ['image/gif', 'gif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/heic', 'heic'],
  ['image/heif', 'heif'],
])

function response(body: unknown, status: number, origin: string | null) {
  const configuredOrigins = (Deno.env.get('WORKBENCH_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const allowedOrigin = origin && configuredOrigins.includes(origin) ? origin : 'null'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Vary': 'Origin',
    },
  })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') {
    const configuredOrigins = (Deno.env.get('WORKBENCH_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const allowedOrigin = origin && configuredOrigins.includes(origin) ? origin : 'null'
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Vary': 'Origin',
      },
    })
  }
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin)

  const authorization = request.headers.get('authorization')
  if (!authorization) return response({ error: 'Authentication required' }, 401, origin)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return response({ error: 'Authentication required' }, 401, origin)

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return response({ error: 'An avatar file is required' }, 400, origin)
  if (file.size === 0 || file.size > maxBytes) return response({ error: 'Avatar must be between 1 byte and 5 MB' }, 400, origin)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const detectedType = await fileTypeFromBuffer(bytes)
  const extension = detectedType ? allowedTypes.get(detectedType.mime) : undefined
  if (!detectedType || !extension) return response({ error: 'Avatar content is not an approved image type' }, 415, origin)

  const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, bytes, {
    contentType: detectedType.mime,
    upsert: false,
  })
  if (uploadError) return response({ error: uploadError.message }, 400, origin)

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60)
  if (signedUrlError) return response({ error: signedUrlError.message }, 400, origin)

  return response({ path, signedUrl: signedUrlData?.signedUrl ?? null }, 200, origin)
})
