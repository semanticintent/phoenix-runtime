// Phase 1 — Agent Registry
// Defines the pipeline sequence and prerequisites for each agent.

import type { ConstructType } from '../parser/sil.js'

export interface AgentDefinition {
  id: string
  name: string
  promptFile: string
  requires: {
    agents: string[]
    gates: string[]
    constructs: ConstructType[]
  }
  produces: ConstructType[]
  humanGate: boolean
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'a-00',
    name: 'Signal Extraction',
    promptFile: 'agents/A-00-SIGNAL-EXTRACTION.md',
    requires: { agents: [], gates: [], constructs: [] },
    produces: ['signal'],
    humanGate: false,
  },
  {
    id: 'a-01',
    name: 'Business Logic Extractor',
    promptFile: 'agents/A-01-BUSINESS-LOGIC-EXTRACTOR.md',
    requires: { agents: ['a-00'], gates: [], constructs: ['signal'] },
    produces: ['workflow'],
    humanGate: false,
  },
  {
    id: 'a-02',
    name: 'UI Archaeologist',
    promptFile: 'agents/A-02-UI-ARCHAEOLOGIST.md',
    requires: { agents: ['a-01'], gates: [], constructs: ['workflow'] },
    produces: ['screen'],
    humanGate: false,
  },
  {
    id: 'a-03',
    name: 'Requirements Synthesizer',
    promptFile: 'agents/A-03-REQUIREMENTS-SYNTHESIZER.md',
    requires: { agents: ['a-01', 'a-02'], gates: [], constructs: ['workflow', 'screen'] },
    produces: ['spec'],
    humanGate: false,
  },
  {
    id: 'a-04',
    name: 'Solution Architect',
    promptFile: 'agents/A-04-SOLUTION-ARCHITECT.md',
    requires: { agents: ['a-03'], gates: [], constructs: ['spec'] },
    produces: ['architecture', 'blueprint'],
    humanGate: false,
  },
  {
    id: 'a-05',
    name: 'Builder',
    promptFile: 'agents/A-05-BUILDER.md',
    requires: {
      agents: ['a-04'],
      gates: ['a-04-approved'],
      constructs: ['spec', 'blueprint', 'screen'],
    },
    produces: ['build'],
    humanGate: true, // six human gates — one per pass
  },
  {
    id: 'a-06',
    name: 'Validator & Certifier',
    promptFile: 'agents/A-06-VALIDATOR-CERTIFIER.md',
    requires: {
      agents: ['a-05'],
      gates: ['pass-1', 'pass-2', 'pass-3', 'pass-4', 'pass-5', 'pass-6'],
      constructs: ['spec', 'build'],
    },
    produces: ['certification'],
    humanGate: false,
  },
]

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id)
}
