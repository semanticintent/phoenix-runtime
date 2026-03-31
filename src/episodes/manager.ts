// Phase 1 — Episode Manager
// Reads open episodes and injects context into agent prompts.
// Every phoenix run checks episodes first — not optional, baked into orchestrator.

export interface Episode {
  id: string
  date: string
  trigger: string
  status: 'open' | 'active' | 'resolved'
  change: string
  reason: string
  affects: Record<string, string> // agentId → what to do
  skip: string[]
}

export function readOpenEpisodes(projectPath: string): Episode[] {
  throw new Error('Not implemented')
}

export function episodesForAgent(agentId: string, episodes: Episode[]): Episode[] {
  throw new Error('Not implemented')
}

export function buildEpisodeContext(episodes: Episode[]): string {
  throw new Error('Not implemented')
}

export function writeEpisode(projectPath: string, episode: Episode): void {
  throw new Error('Not implemented')
}

export function resolveEpisode(episodeId: string, projectPath: string): void {
  throw new Error('Not implemented')
}
