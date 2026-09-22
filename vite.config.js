import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function deploymentVersionPlugin() {
  return {
    name: 'deployment-version',
    generateBundle() {
      const version = globalThis.process?.env?.VERCEL_GIT_COMMIT_SHA ?? globalThis.process?.env?.GIT_COMMIT_SHA ?? new Date().toISOString()
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version }),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), deploymentVersionPlugin()],
})
