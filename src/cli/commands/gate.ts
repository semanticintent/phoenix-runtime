import { resolve } from 'node:path'
import { Command } from 'commander'
import { readState, writeState, approveGate, returnGate } from '../../pipeline/state.js'
import { display } from '../display.js'

const VALID_GATES = [
  'a-04-approved',
  'pass-1',
  'pass-2',
  'pass-3',
  'pass-4',
  'pass-5',
  'pass-6',
]

export const gateCommand = new Command('gate')
  .argument('<gate-id>', `gate to act on — ${VALID_GATES.join(' | ')}`)
  .option('--approve', 'approve this gate — unblocks the next step')
  .option('--return', 'return this gate — sends back for rework')
  .option('--notes <text>', 'notes recorded with this gate decision')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .description('Approve or return a human gate')
  .action((gateId: string, options: { approve?: boolean; return?: boolean; notes?: string; project: string }) => {
    if (!options.approve && !options.return) {
      display.error('Specify --approve or --return')
      process.exit(1)
    }

    const projectPath = resolve(options.project)
    const notes = options.notes ?? ''

    let state
    try {
      state = readState(projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    const updated = options.approve
      ? approveGate(gateId, notes, state)
      : returnGate(gateId, notes, state)

    writeState(projectPath, updated)

    display.blank()
    if (options.approve) {
      display.success(`Gate approved: ${gateId}`)
      if (notes) display.info(`  Notes: ${notes}`)
      display.blank()
      display.info('  Run `phoenix status` to see what is now unblocked.')
    } else {
      display.warn(`Gate returned: ${gateId}`)
      if (notes) display.info(`  Notes: ${notes}`)
      display.blank()
      display.info('  Address the feedback, then re-run the agent pass.')
    }
    display.blank()
  })
