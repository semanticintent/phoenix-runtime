import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { runCommand } from './commands/run.js'
import { statusCommand } from './commands/status.js'
import { gateCommand } from './commands/gate.js'
import { episodeCommand } from './commands/episode.js'
import { validateCommand } from './commands/validate.js'
import { completeCommand } from './commands/complete.js'
import { exportCommand } from './commands/export.js'

const program = new Command()

program
  .name('phoenix')
  .description('Phoenix Pipeline Runtime — orchestrate the 7-agent legacy modernization pipeline')
  .version('1.0.0')

program.addCommand(initCommand)
program.addCommand(runCommand)
program.addCommand(statusCommand)
program.addCommand(gateCommand)
program.addCommand(episodeCommand)
program.addCommand(validateCommand)
program.addCommand(completeCommand)
program.addCommand(exportCommand)

program.parse()
