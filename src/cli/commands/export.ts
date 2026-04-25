import { writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Command } from 'commander'
import { readState } from '../../pipeline/state.js'
import { AGENTS } from '../../pipeline/agents.js'
import { readSil } from '../../parser/sil.js'
import { display } from '../display.js'

function str(val: string | string[] | undefined): string {
  if (val === undefined) return ''
  return Array.isArray(val) ? val.join('\n') : val
}

const ARTIFACT_DIRS: Record<string, string> = {
  signals: 'signals',
  workflows: 'workflows',
  screens: 'screens',
  specs: 'specs',
  architecture: 'architecture',
  build: 'build',
  certification: 'certification',
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter((f) => f.endsWith('.sil')).length
}

function readAllEpisodes(projectPath: string) {
  const dir = join(projectPath, 'episodes')
  if (!existsSync(dir)) return []
  const docs = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sil')).sort()) {
    try { docs.push(readSil(join(dir, f))) } catch { /* skip malformed */ }
  }
  return docs
}

function buildMarkdown(projectPath: string): string {
  const state = readState(projectPath)
  const lines: string[] = []
  const completedCount = Object.keys(state.agents).length
  const date = new Date().toISOString().slice(0, 10)

  lines.push(`# Phoenix Engagement: ${state.project}`)
  lines.push('')
  lines.push(`> Exported ${date} · ${completedCount}/7 agents complete · ${state.openEpisodes.length} open episodes`)
  lines.push('')

  // Pipeline table
  lines.push('## Pipeline')
  lines.push('')
  lines.push('| Agent | Name | Status | Confidence | Outputs | Completed |')
  lines.push('|-------|------|--------|------------|---------|-----------|')
  for (const a of AGENTS) {
    const run = state.agents[a.id]
    if (run) {
      const date = run.completedAt.slice(0, 10)
      lines.push(`| ${a.id.toUpperCase()} | ${a.name} | complete | ${run.confidence} | ${run.outputCount} | ${date} |`)
    } else {
      lines.push(`| ${a.id.toUpperCase()} | ${a.name} | pending | — | — | — |`)
    }
  }
  lines.push('')

  // Agent summaries
  lines.push('### Agent Summaries')
  lines.push('')
  for (const a of AGENTS) {
    const run = state.agents[a.id]
    if (run?.summary) {
      lines.push(`**${a.id.toUpperCase()} — ${a.name}:** ${run.summary}`)
      lines.push('')
    }
  }

  // Gates
  const gateEntries = Object.values(state.gates)
  if (gateEntries.length > 0) {
    lines.push('## Human Gates')
    lines.push('')
    lines.push('| Gate | Status | Reviewed | Notes |')
    lines.push('|------|--------|----------|-------|')
    for (const g of gateEntries) {
      const reviewed = g.reviewedAt ? g.reviewedAt.slice(0, 10) : '—'
      const notes = g.notes || '—'
      lines.push(`| ${g.gateId} | ${g.status} | ${reviewed} | ${notes} |`)
    }
    lines.push('')
  }

  // Episodes
  const episodes = readAllEpisodes(projectPath)
  if (episodes.length > 0) {
    lines.push('## Episodes')
    lines.push('')
    for (const doc of episodes) {
      if (!doc) continue
      const status = str(doc.fields['status']) || 'unknown'
      const change = str(doc.fields['change'])
      const reason = str(doc.fields['reason'])
      lines.push(`### ${doc.id} · ${status}`)
      if (change) lines.push(`**Change:** ${change}`)
      lines.push('')
      if (reason) lines.push(`**Reason:** ${reason}`)
      lines.push('')
      const affects = str(doc.fields['affects'])
      if (affects) {
        lines.push('**Affects:**')
        lines.push('```')
        lines.push(affects.trim())
        lines.push('```')
        lines.push('')
      }
    }
  }

  // Artifact counts
  lines.push('## Artifact Counts')
  lines.push('')
  lines.push('| Directory | Files |')
  lines.push('|-----------|-------|')
  for (const [label, dir] of Object.entries(ARTIFACT_DIRS)) {
    const count = countFiles(join(projectPath, dir))
    lines.push(`| ${label}/ | ${count} |`)
  }
  lines.push('')

  // Certification
  const certPath = join(projectPath, 'certification', 'cert.summary.sil')
  if (existsSync(certPath)) {
    try {
      const cert = readSil(certPath)
      const result = str(cert.fields['certification'])
      const confidence = str(cert.fields['confidence'])
      const certified = str(cert.fields['specs-certified'])
      const withNotes = str(cert.fields['specs-with-notes'])
      const onHold = str(cert.fields['specs-on-hold'])
      const condition = str(cert.fields['condition'])
      const releaseNotes = str(cert.fields['release-notes'])

      lines.push('## Certification')
      lines.push('')
      lines.push(`**Result:** ${result} (${confidence} confidence)`)
      lines.push('')
      if (certified || withNotes || onHold) {
        lines.push(`${certified} certified · ${withNotes} with notes · ${onHold} on hold`)
        lines.push('')
      }
      if (condition) {
        lines.push(`**Condition:** ${condition.trim()}`)
        lines.push('')
      }
      if (releaseNotes) {
        lines.push('**Release notes:**')
        lines.push('')
        lines.push(releaseNotes.trim())
        lines.push('')
      }
    } catch { /* skip malformed cert */ }
  }

  return lines.join('\n')
}

export const exportCommand = new Command('export')
  .option('--project <path>', 'path to the Phoenix project', process.cwd())
  .option('--output <file>', 'write summary to file instead of terminal')
  .description('Generate a markdown summary of the engagement')
  .action((options: { project: string; output?: string }) => {
    const projectPath = resolve(options.project)

    let markdown: string
    try {
      markdown = buildMarkdown(projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    if (options.output) {
      const outPath = resolve(options.output)
      writeFileSync(outPath, markdown, 'utf-8')
      display.blank()
      display.success(`Engagement summary written to: ${outPath}`)
      display.blank()
    } else {
      console.log(markdown)
    }
  })
