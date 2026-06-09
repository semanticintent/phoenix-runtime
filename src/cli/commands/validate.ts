import { resolve } from 'node:path'
import { Command } from 'commander'
import { validateArtifacts } from '../../pipeline/orchestrator.js'
import { display } from '../display.js'

export const validateCommand = new Command('validate')
  .argument('<agent-id>', 'agent whose outputs to validate — a-00 through a-06')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .description('Check that all expected artifact outputs exist and are valid .sil files')
  .action((agentId: string, options: { project: string }) => {
    const projectPath = resolve(options.project)

    let result
    try {
      result = validateArtifacts(agentId, projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    display.blank()
    display.header(`Artifact validation — ${agentId.toUpperCase()}`)

    // Construct-level existence check
    for (const construct of result.expected) {
      const count = result.found[construct] ?? 0
      const missing = result.missing.includes(construct)
      if (missing) {
        display.error(`${construct.padEnd(16)} 0 files — missing`)
      } else {
        display.success(`${construct.padEnd(16)} ${count} file${count !== 1 ? 's' : ''}`)
      }
    }

    // Content-level issues
    const errors = result.fileResults.filter((f) => !f.ok)
    const warnings = result.fileResults.filter((f) => f.ok && f.confidence === 'low')

    if (errors.length > 0) {
      display.blank()
      display.header('Content issues')
      for (const f of errors) {
        if (f.error) {
          display.error(`  ${f.file.padEnd(36)} parse error — ${f.error}`)
        } else if (f.constructMismatch) {
          display.error(
            `  ${f.file.padEnd(36)} type mismatch — expected ${f.constructMismatch.expected}, found ${f.constructMismatch.found}`
          )
        }
      }
    }

    if (warnings.length > 0) {
      display.blank()
      for (const f of warnings) {
        display.warn(`  ${f.file.padEnd(36)} confidence: low — review before proceeding`)
      }
    }

    display.blank()

    const hasErrors = result.missing.length > 0 || errors.length > 0

    if (hasErrors) {
      const parts: string[] = []
      if (result.missing.length > 0) parts.push(`${result.missing.length} missing construct type(s)`)
      if (result.parseErrors.length > 0) parts.push(`${result.parseErrors.length} parse error(s)`)
      const typeMismatches = errors.filter((f) => f.constructMismatch).length
      if (typeMismatches > 0) parts.push(`${typeMismatches} type mismatch(es)`)
      display.warn(parts.join(' · ') + ' — fix artifacts or re-run the agent.')
      process.exit(1)
    } else {
      display.success('All expected artifacts present and valid.')
      if (warnings.length > 0) {
        display.warn(`${warnings.length} low-confidence file(s) — review before proceeding to next agent.`)
      }
      display.blank()
      display.info(`  If this agent ran out-of-band (e.g. in Claude Code), mark it complete:`)
      display.info(`  phoenix complete ${agentId} --confidence high --outputs <n> --summary "<what it produced>"`)
    }

    display.blank()
  })
