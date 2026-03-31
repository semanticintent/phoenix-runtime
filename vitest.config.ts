import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // CLI commands and entry points are covered by integration tests
      // via child_process spawn — exclude from threshold enforcement
      exclude: [
        'bin/**',
        'src/index.ts',
        'src/cli/**',
        'dist/**',
        'tests/**',
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
})
