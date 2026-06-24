import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Build config for all three Electron targets. The main and preload processes
// keep their runtime dependencies (e.g. active-win, which ships a native
// binary) external so they resolve from node_modules instead of being bundled.
// The renderer is a standard Vite + React build; electron-vite sets a relative
// base so the built index.html works when loaded from disk in a packaged app.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: 'src/renderer/index.html',
      },
    },
  },
})
