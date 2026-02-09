import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootPackagePath = resolve(currentDir, '../../package.json')
const rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf8')) as {
  version?: string
}
const appVersion = rootPackage.version ?? '0.0.0'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4495', // URL da sua API
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
