import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import { fileURLToPath, URL } from 'node:url'

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const STARTUP_ARGS = ['.', ...(process.env.ELECTRON_EXTRA_ARGS?.split(' ').filter(Boolean) ?? [])]

export default defineConfig({
  resolve: {
    alias: {
      '@': resolvePath('./src'),
      '@shared': resolvePath('./shared'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        // Startas utan --no-sandbox (pluginets standard) så att utvecklingsläget
        // kör med samma säkerhetsinställningar som den installerade appen.
        onstart: ({ startup }) => {
          void startup([...STARTUP_ARGS])
        },
        vite: {
          resolve: { alias: { '@shared': resolvePath('./shared') } },
          build: {
            outDir: 'dist-electron',
            emptyOutDir: false,
            minify: false,
            rollupOptions: {
              external: ['electron'],
              output: { format: 'cjs', entryFileNames: 'main.js' },
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          resolve: { alias: { '@shared': resolvePath('./shared') } },
          build: {
            outDir: 'dist-electron',
            emptyOutDir: false,
            minify: false,
            rollupOptions: {
              external: ['electron'],
              output: { format: 'cjs', entryFileNames: 'preload.js', inlineDynamicImports: true },
            },
          },
        },
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5273,
    strictPort: false,
  },
  clearScreen: false,
})
