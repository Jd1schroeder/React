const workOrderRoutePattern = /^\/workorders\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i
const maxWorkOrderLinksPerComment = 10

function appendTextSegment(segments, text) {
  if (!text) return
  const previous = segments.at(-1)
  if (previous?.type === 'text') previous.text += text
  else segments.push({ type: 'text', text })
}

export function extractWorkbenchWorkOrderLinks(body, currentOrigin = window.location.origin) {
  const segments = []
  const urlPattern = /https?:\/\/[^\s<>"']+|\/workorders\/[0-9a-f-]{36}(?:[?#][^\s<>"']*)?/gi
  let cursor = 0
  let linkCount = 0
  let match

  while ((match = urlPattern.exec(body ?? '')) !== null) {
    const rawUrl = match[0]
    const url = rawUrl.replace(/[),.!?;:]+$/u, '')
    const trailingText = rawUrl.slice(url.length)
    let workOrderId = null
    try {
      const parsed = new URL(url, currentOrigin)
      const routeMatch = parsed.origin === currentOrigin ? parsed.pathname.match(workOrderRoutePattern) : null
      if (routeMatch) workOrderId = decodeURIComponent(routeMatch[1])
    } catch {
      // Keep malformed or non-Workbench URLs as ordinary comment text.
    }

    if (!workOrderId || linkCount >= maxWorkOrderLinksPerComment) continue
    if (match.index > cursor) appendTextSegment(segments, body.slice(cursor, match.index))
    segments.push({ type: 'work-order-link', workOrderId })
    appendTextSegment(segments, trailingText)
    cursor = match.index + rawUrl.length
    linkCount += 1
  }

  if (cursor < (body ?? '').length) appendTextSegment(segments, body.slice(cursor))
  return segments.length ? segments : [{ type: 'text', text: body ?? '' }]
}
