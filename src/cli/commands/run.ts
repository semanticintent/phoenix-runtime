import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Command } from 'commander'
import { prepareRun } from '../../pipeline/orchestrator.js'
import { display } from '../display.js'

export const runCommand = new Command('run')
  .argument('<agent-id>', 'agent to run — a-00 through a-06')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .option('--output <file>', 'write prompt to file instead of terminal')
  .description('Prepare and output the prompt for an agent run')
  .action(async (agentId: string, options: { project: string; output?: string }) => {
    const projectPath = resolve(options.project)

    display.blank()
    display.info(`Preparing ${agentId.toUpperCase()} — checking prerequisites...`)

    let result
    try {
      result = await prepareRun(agentId, projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    if (!result.ready) {
      display.blank()
      display.error(`${agentId.toUpperCase()} is not ready`)
      display.info(`  Reason: ${result.reason}`)
      display.blank()
      display.info('  Run `phoenix status` to see the full pipeline state.')
      display.blank()
      process.exit(1)
    }

    // Report what was checked
    if (result.prerequisitesMet.length > 0) {
      for (const prereq of result.prerequisitesMet) {
        display.success(prereq)
      }
    }

    if (result.episodeCount > 0) {
      display.warn(`${result.episodeCount} open episode(s) injected into prompt`)
    }

    const prompt = result.prompt!

    if (options.output) {
      const outPath = resolve(options.output)
      writeFileSync(outPath, prompt, 'utf-8')
      display.blank()
      display.success(`Prompt written to: ${outPath}`)
      display.info('  Open the file and paste its contents into Claude Code.')
    } else {
      display.prompt(prompt)
      display.info('  Copy the prompt above and paste it into Claude Code.')
      display.info('  When the agent completes, run: phoenix status')
    }

    display.blank()
  })
