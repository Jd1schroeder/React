import { access } from 'node:fs/promises'

try {
  await access('AGENTS.md')
  console.log('Instruction check passed: AGENTS.md exists.')
} catch {
  console.error('Instruction check failed: AGENTS.md is missing from the repository root.')
  process.exitCode = 1
}
