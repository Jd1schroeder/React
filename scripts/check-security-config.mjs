import fs from 'node:fs'

const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
const headers = new Map(
  vercelConfig.headers
    ?.flatMap((entry) => entry.headers ?? [])
    .map((header) => [header.key.toLowerCase(), header.value]) ?? [],
)

const required = {
  'content-security-policy': headers.get('content-security-policy'),
  'x-content-type-options': headers.get('x-content-type-options'),
  'x-frame-options': headers.get('x-frame-options'),
  'referrer-policy': headers.get('referrer-policy'),
  'permissions-policy': headers.get('permissions-policy'),
}

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key)

const csp = required['content-security-policy'] ?? ''
const errors = [...missing]
if (csp.includes("script-src 'unsafe-eval'")) errors.push("CSP script-src must not allow 'unsafe-eval'")
if (!csp.includes("frame-ancestors 'none'")) errors.push("CSP must deny framing with frame-ancestors 'none'")
if (required['x-content-type-options'] !== 'nosniff') errors.push('X-Content-Type-Options must be nosniff')
if (required['x-frame-options'] !== 'DENY') errors.push('X-Frame-Options must be DENY')

if (errors.length > 0) {
  console.error(`Security header configuration failed:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

console.log('Security header configuration passed.')
