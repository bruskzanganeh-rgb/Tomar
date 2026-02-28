import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/types/**', 'lib/supabase/**', 'lib/hooks/**', '**/*.d.ts'],
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 80,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
