const targetUrl = process.env.SECURITY_HEADERS_URL

if (!targetUrl) {
  console.error('Missing SECURITY_HEADERS_URL. Set it to the deployed Workbench URL.')
  process.exit(1)
}

const response = await fetch(targetUrl, { redirect: 'manual' })
const required = {
  'content-security-policy': (value) => value?.includes("frame-ancestors 'none'") && !value.includes("script-src 'unsafe-eval'"),
  'x-content-type-options': (value) => value === 'nosniff',
  'x-frame-options': (value) => value === 'DENY',
  'referrer-policy': (value) => value === 'strict-origin-when-cross-origin',
  'permissions-policy': (value) => Boolean(value),
}

const failures = Object.entries(required)
  .filter(([header, validate]) => !validate(response.headers.get(header)))
  .map(([header]) => header)

if (failures.length > 0) {
  console.error(`Security headers missing or invalid for ${targetUrl}:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(`Security headers passed for ${targetUrl} (${response.status}).`)
