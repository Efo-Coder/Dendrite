import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    dedupe: ['lexical'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // The PDF exporter's headless Chromium (in the backend container) loads /print
    // via the docker service name, which Vite blocks by default. Dev-only.
    allowedHosts: ['frontend', 'dendrite-frontend'],
    watch: {
      usePolling: true,
    },
  },
})
