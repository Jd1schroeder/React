export function formatCompactDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    remainder ? `${remainder}s` : null,
  ].filter(Boolean).join(' ') || '0s'
}
