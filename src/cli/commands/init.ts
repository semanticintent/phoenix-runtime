import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { Command } from 'commander'
import { initState, writeState } from '../../pipeline/state.js'
import { display } from '../display.js'

const DIRS = [
  'signals',
  'workflows',
  'screens',
  'specs',
  'architecture',
  'build',
  'certification',
  'episodes',
]

const SEPARATOR = '─'.repeat(41)

function missionTemplate(projectName: string): string {
  return [
    'CONSTRUCT  signal',
    `ID         _mission`,
    'VERSION    1',
    SEPARATOR,
    `project:   ${projectName}`,
    `system:    (describe the system being modernized)`,
    `team:      (team context — who built it, how long, current state)`,
    `domain:    (business domain — e.g. order management, billing, logistics)`,
    ``,
    `known-workflows:`,
    `  - (list known workflows here)`,
    ``,
    `known-integrations:`,
    `  - (list known external systems)`,
    ``,
    `notes:     (anything worth flagging before extraction starts)`,
  ].join('\n')
}

export const initCommand = new Command('init')
  .argument('[project-name]', 'name for the project (defaults to current directory name)')
  .option('--project <path>', 'path to initialize (defaults to current directory)', process.cwd())
  .description('Initialize a new Phoenix engagement in the current directory')
  .action((projectName: string | undefined, options: { project: string }) => {
    const projectPath = options.project
    const name = projectName ?? basename(projectPath)
    const stateFile = join(projectPath, '.phoenix', 'state.json')

    if (existsSync(stateFile)) {
      display.warn(`Already initialized: ${stateFile}`)
      display.info('Remove .phoenix/state.json to reinitialize.')
      process.exit(1)
    }

    // Create directory structure
    for (const dir of DIRS) {
      mkdirSync(join(projectPath, dir), { recursive: true })
    }

    // Write initial state
    const state = initState(projectPath, name)
    writeState(projectPath, state)

    // Write _mission.sil template
    const missionPath = join(projectPath, '_mission.sil')
    if (!existsSync(missionPath)) {
      writeFileSync(missionPath, missionTemplate(name), 'utf-8')
    }

    display.blank()
    display.success(`Initialized Phoenix engagement: ${name}`)
    display.blank()
    display.info('  Directories created:')
    for (const dir of DIRS) display.info(`    /${dir}/`)
    display.blank()
    display.info('  Files created:')
    display.info('    _mission.sil     ← fill this in before running A-00')
    display.info('    .phoenix/state.json')
    display.blank()
    display.info('  Next: edit _mission.sil, then run:')
    display.info('    phoenix run a-00')
    display.blank()
  })
