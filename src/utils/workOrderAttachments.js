export const WORK_ORDER_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

export function getSafeAttachmentExtension(fileName = '') {
  const name = fileName.split(/[\\/]/).pop() ?? ''
  const separatorIndex = name.lastIndexOf('.')
  if (separatorIndex <= 0 || separatorIndex === name.length - 1) return ''
  const extension = name.slice(separatorIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)
  return extension ? `.${extension}` : ''
}
