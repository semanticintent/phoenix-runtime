import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

// Runtime root — the directory where phoenix-runtime is installed.
// Agent prompts ship with the package in /agents/*.md.
// PHOENIX_RUNTIME_ROOT env var overrides — useful for development and testing.
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../')

export function runtimeRoot(): string {
  return process.env['PHOENIX_RUNTIME_ROOT'] ?? PACKAGE_ROOT
}

// Load an agent prompt from promptFile (relative to runtimeRoot).
// Throws clearly if the file is missing — agents/ must be populated.
export function loadPrompt(promptFile: string, root: string = PACKAGE_ROOT): string {
  const filePath = join(root, promptFile)
  if (!existsSync(filePath)) {
    throw new Error(
      `Agent prompt not found: ${filePath}\n` +
        `Ensure agents/ directory is populated in ${root}`
    )
  }
  return readFileSync(filePath, 'utf-8')
}
