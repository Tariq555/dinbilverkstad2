import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // Huvudprocessens kod importerar 'electron' — i tester ersätts det av en stub.
      electron: resolvePath('./tests/electronStub.ts'),
      '@shared': resolvePath('./shared'),
      '@': resolvePath('./src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      reporter: ['text', 'html'],
      include: ['electron/**/*.ts', 'src/utils/**/*.ts', 'src/features/**/*.ts', 'shared/**/*.ts'],
      exclude: ['electron/main.ts', 'electron/preload.ts', 'electron/ipc/**'],
    },
  },
})
