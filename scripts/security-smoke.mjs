import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Serve the real runtime modules without CRXJS/HMR activation or extension APIs.
// Open the printed URL in Chrome; all checks and failures are visible in-page.
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4180, strictPort: true }
})
await server.listen()
console.log('Security regression: http://127.0.0.1:4180/test/browser/sanitizer-security.html')
