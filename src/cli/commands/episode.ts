import { createInterface } from 'node:readline'
import { resolve, join } from 'node:path'
import { readdirSync, existsSync } from 'node:fs'
import { Command } from 'commander'
import { readSil } from '../../parser/sil.js'
import { writeEpisode, resolveEpisode, readOpenEpisodes } from '../../episodes/manager.js'
import type { Episode } from '../../episodes/manager.js'
import { AGENTS } from '../../pipeline/agents.js'
import { display } from '../display.js'

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve))
}

function nextEpisodeId(projectPath: string): string {
  const dir = join(projectPath, 'episodes')
  if (!existsSync(dir)) return 'ep-001'
  const files = readdirSync(dir).filter((f) => f.endsWith('.sil'))
  const nums = files
    .map((f) => parseInt(f.replace('ep-', '').replace('.sil', ''), 10))
    .filter((n) => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `ep-${String(next).padStart(3, '0')}`
}

const newSubcommand = new Command('new')
  .description('Record a new requirement change or mid-engagement event')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .action(async (options: { project: string }) => {
    const projectPath = resolve(options.project)
    const rl = createInterface({ input: process.stdin, output: process.stdout })

    display.blank()
    display.header('New Episode')
    display.info('  Record a requirement change or mid-engagement event.')
    display.info('  Every subsequent agent run will receive this context.')
    display.blank()

    const id = nextEpisodeId(projectPath)
    display.info(`  Episode ID: ${id}`)
    display.blank()

    const change = await ask(rl, '  What changed?\n  > ')
    const reason = await ask(rl, '\n  Why? (client decision, data finding, stakeholder request)\n  > ')
    const trigger = await ask(rl, '\n  Trigger type (requirement change / scope change / stakeholder request / data finding)\n  > ')

    display.blank()
    display.info('  Which agents need attention? (space-separated, e.g. "a-01 a-03 a-05")')
    display.info('  Agents: ' + AGENTS.map((a) => a.id).join('  '))
    const affectsRaw = await ask(rl, '  > ')

    const affectsIds = affectsRaw.trim().split(/\s+/).filter(Boolean)
    const affects: Record<string, string> = {}

    for (const agentId of affectsIds) {
      const instruction = await ask(rl, `\n  What should ${agentId.toUpperCase()} do?\n  > `)
      affects[agentId] = instruction.trim()
    }

    const allAgentIds = AGENTS.map((a) => a.id)
    const skip = allAgentIds.filter((id) => !(id in affects))

    rl.close()

    const episode: Episode = {
      id,
      date: new Date().toISOString().split('T')[0],
      trigger: trigger.trim(),
      status: 'open',
      change: change.trim(),
      reason: reason.trim(),
      affects,
      skip,
    }

    writeEpisode(projectPath, episode)

    display.blank()
    display.success(`Episode recorded: ${id}`)
    display.info(`  Affects: ${Object.keys(affects).join(', ')}`)
    display.info(`  Skip:    ${skip.join(', ')}`)
    display.blank()
    display.info('  Every subsequent phoenix run will inject this episode into the prompt.')
    display.blank()
  })

const listSubcommand = new Command('list')
  .description('List episodes')
  .option('--status <status>', 'filter by status: open | active | resolved')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .action((options: { status?: string; project: string }) => {
    const projectPath = resolve(options.project)
    const dir = join(projectPath, 'episodes')

    if (!existsSync(dir)) {
      display.info('No episodes directory found.')
      return
    }

    const files = readdirSync(dir).filter((f) => f.endsWith('.sil'))
    if (files.length === 0) {
      display.info('No episodes recorded.')
      return
    }

    display.blank()
    display.header('Episodes')

    for (const file of files.sort()) {
      const construct = readSil(join(dir, file))
      const status = String(construct.fields['status'] ?? 'unknown')
      const change = String(construct.fields['change'] ?? '').split('\n')[0]
      const date = String(construct.fields['date'] ?? '')

      if (options.status && status !== options.status) continue

      const statusColor =
        status === 'open' ? '🟡' : status === 'resolved' ? '✓' : '⟳'

      console.log(`  ${statusColor}  ${construct.id.padEnd(10)} ${date.padEnd(14)} ${change}`)
    }

    display.blank()
  })

const resolveSubcommand = new Command('resolve')
  .argument('<episode-id>', 'episode ID to resolve, e.g. ep-042')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .description('Mark an episode as resolved')
  .action((episodeId: string, options: { project: string }) => {
    const projectPath = resolve(options.project)

    try {
      resolveEpisode(episodeId, projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    display.blank()
    display.success(`Episode resolved: ${episodeId}`)
    display.info('  It will no longer be injected into agent prompts.')
    display.blank()
  })

export const episodeCommand = new Command('episode')
  .description('Manage mid-engagement episodes (requirement changes, scope events)')
  .addCommand(newSubcommand)
  .addCommand(listSubcommand)
  .addCommand(resolveSubcommand)
