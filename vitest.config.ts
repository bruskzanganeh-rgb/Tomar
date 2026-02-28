import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // Unit tests run in jsdom; integration tests need node environment
    environmentMatchGlobs: [
      ['tests/integration/**', 'node'],
    ],
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
