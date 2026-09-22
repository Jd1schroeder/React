import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function deploymentVersionPlugin() {
  return {
    name: 'deployment-version',
    generateBundle() {
      const deploymentVersion = globalThis.process?.env?.VERCEL_GIT_COMMIT_SHA ?? globalThis.process?.env?.GIT_COMMIT_SHA ?? new Date().toISOString()
      const buildDate = new Date()
      const year = String(buildDate.getUTCFullYear()).slice(-2)
      const month = buildDate.getUTCMonth() + 1
      const day = buildDate.getUTCDate()
      const commitReference = globalThis.process?.env?.VERCEL_GIT_COMMIT_SHA ?? globalThis.process?.env?.GIT_COMMIT_SHA
      const buildReference = commitReference
        ? commitReference.slice(0, 7)
        : `${String(buildDate.getUTCHours()).padStart(2, '0')}${String(buildDate.getUTCMinutes()).padStart(2, '0')}${String(buildDate.getUTCSeconds()).padStart(2, '0')}`
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          version: deploymentVersion,
          build: `Build: ${year}.${month}.${day}-${buildReference}`,
        }),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), deploymentVersionPlugin()],
})
