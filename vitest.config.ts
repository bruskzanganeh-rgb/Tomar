import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/types/**', 'lib/supabase/**', 'lib/hooks/**', '**/*.d.ts'],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 20,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
