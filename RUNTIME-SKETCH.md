# Phoenix Runtime — Architecture Sketch
**Version 0.1 — Option 3 Implementation Design**

---

## What This Is

The Phoenix runtime is the orchestration layer for the seven-agent pipeline.
It manages `.sil` file state, enforces pipeline sequence, injects episode
context into every agent run, enforces human gates, and exposes a CLI that
makes running Phoenix on a real engagement as simple as:

```bash
phoenix run a-01 --project ./my-project
phoenix status
phoenix gate pass-1 --approve
```

It follows the same TypeScript + Vitest + CLI binary pattern as `cal-runtime`.
Same ecosystem. Same publish model. Same DOI path when stable.

---

## Repository Structure

```
phoenix-runtime/
├── src/
│   ├── parser/
│   │   └── sil.ts          # .sil file reader and writer
│   ├── pipeline/
│   │   ├── agents.ts       # agent registry and sequence
│   │   ├── orchestrator.ts # run agent, check prereqs, enforce gates
│   │   └── state.ts        # pipeline state — what has run, what passed
│   ├── episodes/
│   │   └── manager.ts      # read open episodes, inject context
│   ├── prompts/
│   │   └── loader.ts       # load agent prompt from /agents/ dir
│   ├── cli/
│   │   ├── index.ts        # CLI entry point
│   │   ├── commands/
│   │   │   ├── init.ts     # phoenix init
│   │   │   ├── run.ts      # phoenix run <agent>
│   │   │   ├── status.ts   # phoenix status
│   │   │   ├── gate.ts     # phoenix gate <pass> --approve / --return
│   │   │   └── episode.ts  # phoenix episode new / list / resolve
│   │   └── display.ts      # terminal output formatting
│   └── index.ts            # public API
├── agents/
│   ├── A-00-SIGNAL-EXTRACTION.md
│   ├── A-01-BUSINESS-LOGIC-EXTRACTOR.md
│   ├── A-02-UI-ARCHAEOLOGIST.md
│   ├── A-03-REQUIREMENTS-SYNTHESIZER.md
│   ├── A-04-SOLUTION-ARCHITECT.md
│   ├── A-05-BUILDER.md
│   └── A-06-VALIDATOR-CERTIFIER.md
├── bin/
│   └── phoenix.js          # CLI binary
├── tests/
│   ├── parser/
│   │   └── sil.test.ts
│   ├── pipeline/
│   │   ├── orchestrator.test.ts
│   │   └── state.test.ts
│   └── episodes/
│       └── manager.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Core Modules

---

### 1. SIL Parser — `src/parser/sil.ts`

The `.sil` parser does one job: read a `.sil` file and return a typed
construct object. It does not validate business logic. It reads structure.

```typescript
// Construct types
export type ConstructType =
  | 'signal'
  | 'workflow'
  | 'screen'
  | 'spec'
  | 'episode'
  | 'architecture'
  | 'blueprint'
  | 'build'
  | 'certification'

// Parsed construct — generic
export interface SilConstruct {
  construct: ConstructType
  id: string
  version: number
  fields: Record<string, string | string[]>
  raw: string
}

// Read a .sil file from disk
export function readSil(path: string): SilConstruct

// Write a .sil file to disk
export function writeSil(path: string, construct: SilConstruct): void

// Read all .sil files in a directory
export function readSilDir(dirPath: string): SilConstruct[]

// Read the mission brief specifically
export function readMissionBrief(projectPath: string): SilConstruct

// Extract confidence from a construct
export function getConfidence(
  construct: SilConstruct
): 'high' | 'medium' | 'low' | null
```

No PEG grammar needed. `.sil` files are line-oriented key-value with a
known header format. A simple line parser handles them. CAL needed PEG
because CAL has expression syntax. EMBER doesn't — it's structured text.

---

### 2. Agent Registry — `src/pipeline/agents.ts`

The agent registry defines the pipeline sequence and what each agent
requires before it can run.

```typescript
export interface AgentDefinition {
  id: string                    // 'a-00' | 'a-01' | ... | 'a-06'
  name: string
  promptFile: string            // path to agent prompt .md
  requires: {
    agents: string[]            // agents that must have run first
    gates: string[]             // gates that must be approved
    constructs: ConstructType[] // .sil construct types that must exist
  }
  produces: ConstructType[]     // what construct types this agent writes
  humanGate: boolean            // does this agent end with a human gate?
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'a-00',
    name: 'Signal Extraction',
    promptFile: 'agents/A-00-SIGNAL-EXTRACTION.md',
    requires: {
      agents: [],
      gates: [],
      constructs: [],
    },
    produces: ['signal'],
    humanGate: false,
  },
  {
    id: 'a-01',
    name: 'Business Logic Extractor',
    promptFile: 'agents/A-01-BUSINESS-LOGIC-EXTRACTOR.md',
    requires: {
      agents: ['a-00'],
      gates: [],
      constructs: ['signal'],
    },
    produces: ['workflow'],
    humanGate: false,
  },
  {
    id: 'a-02',
    name: 'UI Archaeologist',
    promptFile: 'agents/A-02-UI-ARCHAEOLOGIST.md',
    requires: {
      agents: ['a-01'],
      gates: [],
      constructs: ['workflow'],
    },
    produces: ['screen'],
    humanGate: false,
  },
  {
    id: 'a-03',
    name: 'Requirements Synthesizer',
    promptFile: 'agents/A-03-REQUIREMENTS-SYNTHESIZER.md',
    requires: {
      agents: ['a-01', 'a-02'],
      gates: [],
      constructs: ['workflow', 'screen'],
    },
    produces: ['spec'],
    humanGate: false,
  },
  {
    id: 'a-04',
    name: 'Solution Architect',
    promptFile: 'agents/A-04-SOLUTION-ARCHITECT.md',
    requires: {
      agents: ['a-03'],
      gates: [],
      constructs: ['spec'],
    },
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
    humanGate: true,   // six human gates — one per pass
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
```

---

### 3. Pipeline State — `src/pipeline/state.ts`

State lives in a single `.phoenix/state.json` file at the project root.
Simple JSON. Human readable. Git diffable.

```typescript
export interface AgentRun {
  agentId: string
  completedAt: string           // ISO timestamp
  outputCount: number           // number of .sil files produced
  confidence: 'high' | 'medium' | 'low'
  summary: string               // extraction summary text
}

export interface GateRecord {
  gateId: string                // 'pass-1' | 'a-04-approved' | etc
  status: 'pending' | 'approved' | 'returned'
  reviewedAt?: string
  reviewer?: string
  notes?: string
}

export interface PipelineState {
  project: string               // project name
  path: string                  // absolute path to project
  createdAt: string
  updatedAt: string
  agents: Record<string, AgentRun>
  gates: Record<string, GateRecord>
  openEpisodes: string[]        // episode IDs that are open
}

// Read state from .phoenix/state.json
export function readState(projectPath: string): PipelineState

// Write state
export function writeState(projectPath: string, state: PipelineState): void

// Check if an agent can run
export function canRun(
  agentId: string,
  state: PipelineState
): { can: boolean; reason?: string }

// Mark agent as complete
export function markAgentComplete(
  agentId: string,
  run: AgentRun,
  state: PipelineState
): PipelineState

// Approve a gate
export function approveGate(
  gateId: string,
  notes: string,
  state: PipelineState
): PipelineState

// Return a gate (sends back to agent)
export function returnGate(
  gateId: string,
  notes: string,
  state: PipelineState
): PipelineState
```

---

### 4. Episode Manager — `src/episodes/manager.ts`

Every agent run is preceded by an episode context injection. The agent
prompt is prepended with any open episodes that affect it.

```typescript
export interface Episode {
  id: string
  date: string
  trigger: string
  status: 'open' | 'active' | 'resolved'
  change: string
  reason: string
  affects: Record<string, string>   // agentId → what to do
  skip: string[]                    // agentIds to skip
}

// Read all open episodes for a project
export function readOpenEpisodes(projectPath: string): Episode[]

// Filter episodes that affect a specific agent
export function episodesForAgent(
  agentId: string,
  episodes: Episode[]
): Episode[]

// Produce episode context block to prepend to agent prompt
export function buildEpisodeContext(episodes: Episode[]): string
// Returns:
// OPEN EPISODES — READ BEFORE PROCEEDING
// ────────────────────────────────────────
// ep-042 (2026-03-15) — guest checkout
//   Your attention: add guest.checkout workflow
// ────────────────────────────────────────

// Write a new episode .sil file
export function writeEpisode(projectPath: string, episode: Episode): void

// Mark an episode resolved
export function resolveEpisode(
  episodeId: string,
  projectPath: string
): void
```

---

### 5. Orchestrator — `src/pipeline/orchestrator.ts`

The orchestrator is the heart of the runtime. It takes an agent ID,
checks prerequisites, loads the prompt, injects episode context, and
produces the final prompt ready to paste into Claude Code or any
AI interface.

```typescript
export interface RunResult {
  agentId: string
  ready: boolean
  reason?: string               // if not ready, why
  prompt?: string               // if ready, the full contextualized prompt
  episodeCount: number          // how many open episodes were injected
  prerequisitesMet: string[]    // what was checked and passed
}

// Prepare an agent run — returns the full contextualized prompt
export async function prepareRun(
  agentId: string,
  projectPath: string
): Promise<RunResult>

// The prompt produced by prepareRun includes:
// 1. Open episode context block (if any episodes affect this agent)
// 2. The full agent prompt from /agents/*.md
// 3. Project context: paths to read from, paths to write to
// 4. Current pipeline state summary
```

**Key design decision:** The orchestrator does not call an AI API directly.
It produces the prompt. The human pastes it into Claude Code, Claude CLI,
or any other interface. This keeps the runtime lightweight, model-agnostic,
and free of API key management.

This mirrors how CAL runtime works — it executes the DSL logic, but the
human still decides when to run it and what data to feed it.

---

### 6. CLI — `src/cli/`

```
COMMANDS

phoenix init [project-name]
  Creates .phoenix/state.json
  Creates directory structure:
    /signals /workflows /screens /specs /architecture /build /episodes
  Writes _mission.sil template

phoenix status
  Shows pipeline state — which agents ran, which gates passed,
  how many .sil files exist per construct type, open episodes

phoenix run <agent-id> [--project <path>]
  Checks prerequisites
  Reads open episodes
  Loads agent prompt
  Produces contextualized prompt
  Outputs to terminal (copy-paste into Claude Code)
  Or: --output prompt.md to write to file

phoenix gate <gate-id> --approve [--notes "..."]
  Marks a gate approved in state.json
  Unblocks the next agent

phoenix gate <gate-id> --return [--notes "..."]
  Marks a gate returned
  Records what needs fixing

phoenix episode new
  Interactive: prompts for change, reason, affects, skip
  Writes /episodes/ep-NNN.sil

phoenix episode list [--status open|active|resolved]
  Lists episodes with status

phoenix episode resolve <episode-id>
  Marks an episode resolved

phoenix validate <agent-id>
  Checks that all expected .sil files exist for this agent's outputs
  Reports missing or low-confidence files
```

---

### 7. CLI Status Display

The status command produces a readable pipeline dashboard:

```
$ phoenix status

PROJECT: order-management-system
PATH:    /Users/mike/projects/oms
─────────────────────────────────────────────────────

PIPELINE STATUS
  A-00  ✓  complete   high      _mission.sil + 14 signals
  A-01  ✓  complete   mixed     14 workflows (12 high, 2 medium)
  A-02  ✓  complete   high      14 screens
  A-03  ⟳  running    —         7 of 14 specs complete
  A-04  ○  waiting    —         prereq: A-03 complete
  A-05  ○  waiting    —         prereq: A-04 + gate approved
  A-06  ○  waiting    —         prereq: all 6 passes + gates

HUMAN GATES
  a-04-approved    ○  pending
  pass-1 through 6 ○  not started

OPEN EPISODES
  ep-042  guest checkout     affects A-01, A-02, A-03, A-05, A-06
  ep-043  refund rule change  affects A-03, A-05, A-06

ARTIFACT COUNTS
  /signals/       14 files
  /workflows/     14 files
  /screens/       14 files
  /specs/         7 files (7 remaining)
  /architecture/  0 files
  /build/         0 files
  /episodes/      2 open

─────────────────────────────────────────────────────
Next: complete A-03 → phoenix run a-03 --project .
```

---

## package.json Sketch

```json
{
  "name": "@semanticintent/phoenix-runtime",
  "version": "0.1.0",
  "description": "Phoenix Pipeline Runtime — orchestrate the 7-agent legacy modernization pipeline. Manages .sil artifact state, enforces human gates, injects episode context.",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "type": "module",
  "bin": {
    "phoenix": "./bin/phoenix.js"
  },
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "build": "tsc",
    "dev": "vitest watch",
    "validate": "npm run typecheck && npm run test"
  },
  "keywords": [
    "phoenix",
    "legacy-modernization",
    "ember",
    "sil",
    "semantic-intent",
    "agent-pipeline",
    "business-logic-extraction"
  ],
  "author": "Michael Shatny",
  "license": "MIT",
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  }
}
```

Notable difference from cal-runtime: no `peggy` dependency. `.sil` parsing
is line-oriented text, not a grammar. Chalk for terminal color. Commander
for CLI argument parsing — the same pattern used across the ecosystem.

---

## Key Design Decisions

**1. The runtime produces prompts, not AI calls.**
Model-agnostic. Works with Claude Code, Claude CLI, any interface.
No API keys. No rate limits. No vendor lock-in.
The agent prompt is the product. The human decides where to run it.

**2. State is a JSON file, not a database.**
`.phoenix/state.json` lives in the project repo. It travels with the
project. It's diffable. It's human readable. It's backed up automatically
with the code. No external state store needed.

**3. Episode injection is automatic.**
Every `phoenix run` call checks episodes first. The agent never starts
without knowing what's open. This is not optional behavior — it's baked
into the orchestrator, not the CLI flag.

**4. Gates are explicit, not inferred.**
The orchestrator will not let A-05 run unless all required gates are
approved. There is no `--force` flag. There is no bypass. If you want
to skip a gate you edit `state.json` directly — and that edit is in git,
so it's visible and auditable.

**5. Agents are markdown files, not code.**
The agent prompts live in `/agents/*.md`. They are read at runtime, not
compiled in. This means prompts can be updated without rebuilding the
runtime. It also means the runtime version and the prompt version are
decoupled — you can update A-01's prompt without releasing a new runtime
version.

---

## Build Order

```
Phase 1 — Core (usable without CLI)
  src/parser/sil.ts
  src/pipeline/state.ts
  src/pipeline/agents.ts
  src/episodes/manager.ts

Phase 2 — Orchestrator
  src/pipeline/orchestrator.ts
  src/prompts/loader.ts

Phase 3 — CLI
  src/cli/commands/init.ts
  src/cli/commands/status.ts
  src/cli/commands/run.ts
  src/cli/commands/gate.ts
  src/cli/commands/episode.ts
  src/cli/display.ts
  src/cli/index.ts
  bin/phoenix.js

Phase 4 — Tests
  tests/ — full coverage before npm publish
```

---

## What This Enables

A developer with the runtime installed can do this:

```bash
# Start a new Phoenix engagement
phoenix init acme-order-system
cd acme-order-system

# Run signal extraction
phoenix run a-00
# → prints the A-00 prompt with project context
# → paste into Claude Code, run, .sil files appear in /signals/

# Check what happened
phoenix status

# Run business logic extraction
phoenix run a-01
# → prints A-01 prompt prefixed with any open episodes
# → paste into Claude Code, run, .sil files appear in /workflows/

# Something changed mid-way
phoenix episode new
# → prompts for change, reason, affects
# → writes ep-001.sil

# Every subsequent run auto-injects the episode
phoenix run a-02
# → prompt includes: OPEN EPISODES — ep-001 guest checkout...

# Human reviews A-05 Pass 1
phoenix gate pass-1 --approve --notes "screens look correct"

# All passes done — run certification
phoenix run a-06
```

The methodology — formalized today in this conversation — runs as a CLI.
The `.sil` files are the state. The prompts are the agents.
The human is the gate.

---

## Relationship to CAL Runtime

```
cal-runtime                    phoenix-runtime
───────────────────────────    ────────────────────────────
PEG grammar parser             Line-oriented text parser
Executes CAL scripts           Orchestrates agent pipeline
Produces scores + alerts       Produces prompts + artifact state
npm: @stratiqx/cal-runtime     npm: @semanticintent/phoenix-runtime
bin: cal                       bin: phoenix
Methodology: 6D + DRIFT        Methodology: Phoenix + EMBER
```

Same TypeScript foundation. Same Vitest test pattern. Same CLI binary
convention. Same npm publish model. Sibling runtimes for sibling
methodologies.

---

*Phoenix Runtime v0.1 sketch — March 2026*
*Follows cal-runtime TypeScript patterns*
*Ready for Phase 1 implementation*
