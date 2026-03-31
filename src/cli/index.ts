// Phase 3 — CLI entry point
// Commands: init, run, status, gate, episode, validate
import { Command } from 'commander'

const program = new Command()

program
  .name('phoenix')
  .description('Phoenix Pipeline Runtime — orchestrate the 7-agent legacy modernization pipeline')
  .version('0.1.0')

// Commands registered in Phase 3
// program.addCommand(initCommand)
// program.addCommand(runCommand)
// program.addCommand(statusCommand)
// program.addCommand(gateCommand)
// program.addCommand(episodeCommand)
// program.addCommand(validateCommand)

program.parse()
