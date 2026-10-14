import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceRoot = path.resolve(testDirectory, '../../src')
const sharedUiRoot = path.join(sourceRoot, 'components', 'ui')

const canonicalPrimitives = [
  'Button',
  'Select',
  'DatePicker',
  'DataTable',
  'Avatar',
  'ImageDropzone',
  'PriorityBadge',
]

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(entryPath)
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [entryPath] : []
  })
}

function findLocalDefinitions(source, primitiveName) {
  const declaration = new RegExp(
    `\\b(?:function|class)\\s+${primitiveName}\\b|\\b(?:const|let|var)\\s+${primitiveName}\\s*=`,
  )
  return declaration.test(source)
}

describe('reusable component architecture', () => {
  it('keeps canonical shared primitives defined in the shared UI directory', () => {
    const sourceFiles = listSourceFiles(sourceRoot)
    const duplicateDefinitions = []

    for (const sourceFile of sourceFiles) {
      if (sourceFile.startsWith(sharedUiRoot)) continue
      const source = fs.readFileSync(sourceFile, 'utf8')
      for (const primitiveName of canonicalPrimitives) {
        if (findLocalDefinitions(source, primitiveName)) {
          duplicateDefinitions.push(`${path.relative(process.cwd(), sourceFile)} defines ${primitiveName}`)
        }
      }
    }

    expect(duplicateDefinitions, 'Move canonical primitives to src/components/ui or use a feature-specific name.').toEqual([])
  })

  it('keeps every canonical primitive backed by a shared source file', () => {
    const missingSources = canonicalPrimitives.filter(
      (primitiveName) => !fs.existsSync(path.join(sharedUiRoot, `${primitiveName}.jsx`)),
    )

    expect(missingSources).toEqual([])
  })
})
