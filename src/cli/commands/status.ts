import { resolve } from 'node:path'
import { Command } from 'commander'
import { readState } from '../../pipeline/state.js'
import { pipelineSummary } from '../../pipeline/orchestrator.js'
import { display } from '../display.js'

export const statusCommand = new Command('status')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .description('Show current pipeline state — agents, gates, artifact counts')
  .action((options: { project: string }) => {
    const projectPath = resolve(options.project)

    let state
    try {
      state = readState(projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    display.blank()
    console.log(pipelineSummary(state, projectPath))
    display.blank()
  })
