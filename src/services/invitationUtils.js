export function normalizeContactValue(value) {
  const contactValue = value?.trim() ?? ''
  const markdownEmail = contactValue.match(/^\[([^\]]+)\]\(mailto:([^)]+)\)$/i)
  if (markdownEmail && markdownEmail[1].trim().toLowerCase() === markdownEmail[2].trim().toLowerCase()) {
    return markdownEmail[1].trim()
  }
  return contactValue.replace(/^["']+|["']+$/g, '').trim()
}

export async function getFunctionErrorMessage(error) {
  let message = error?.message || 'The invitation service could not complete the request.'
  try {
    const response = error?.context
    const body = response?.clone
      ? await response.clone().json()
      : await response?.json?.()
    if (body?.error) message = body.error
  } catch {
    // Keep the SDK error when the function did not return JSON.
  }
  return message
}
