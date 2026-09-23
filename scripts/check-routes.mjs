import { readFile } from 'node:fs/promises'

const [routeConfigSource, sidebarSource] = await Promise.all([
  readFile('src/routes/routeConfig.jsx', 'utf8'),
  readFile('src/components/layout/sidebarConfig.js', 'utf8'),
])

const pagesBlock = routeConfigSource.match(/const pages = \{([\s\S]*?)\n\}/)?.[1] ?? ''
const routeMatches = [...pagesBlock.matchAll(/^\s*(?:'([^']+)'|([A-Za-z][\w ]*))\s*:/gm)]
const registeredRoutes = new Set(
  routeMatches.map(([, quoted, identifier]) => quoted ?? identifier),
)

for (const [, identifier] of pagesBlock.matchAll(/^\s*([A-Za-z][\w]*)\s*,\s*$/gm)) {
  registeredRoutes.add(identifier)
}

const sidebarRoutes = [
  ...sidebarSource.matchAll(/page:\s*["']([^"']+)["']/g),
].map(([, page]) => page)

const missingRoutes = [...new Set(sidebarRoutes)].filter(
  (page) => !registeredRoutes.has(page),
)

if (missingRoutes.length > 0) {
  console.error('Route check failed. Sidebar destinations missing from src/App.jsx:')
  for (const page of missingRoutes) console.error(`- ${page}`)
  process.exitCode = 1
} else {
  console.log(`Route check passed: ${new Set(sidebarRoutes).size} sidebar destinations are registered.`)
}
