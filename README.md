# phoenix-runtime

**Phoenix Pipeline Runtime** — orchestrate the 7-agent legacy modernization pipeline.

Manages `.sil` artifact state, enforces human gates, injects episode context, and produces agent prompts ready to run in Claude Code or any AI interface.

```bash
phoenix init acme-order-system
phoenix run a-00
phoenix status
phoenix gate pass-1 --approve --notes "screens look correct"
phoenix episode new
phoenix run a-06
```

## How It Works

The runtime does not call an AI API. It produces prompts. You paste them into Claude Code, Claude CLI, or any interface. This keeps the runtime lightweight, model-agnostic, and free of API key management.

State lives in `.phoenix/state.json` at your project root — human readable, git diffable, travels with the project.

## The Pipeline

| Agent | Name | Produces |
|-------|------|----------|
| A-00 | Signal Extraction | Mission brief + signal files |
| A-01 | Business Logic Extractor | ASCII workflow traces |
| A-02 | UI Archaeologist | ASCII wireframes |
| A-03 | Requirements Synthesizer | Semantic intent specs |
| A-04 | Solution Architect | Stack recommendation + blueprints |
| A-05 | Builder | Production codebase (6 passes) |
| A-06 | Validator & Certifier | Certification document |

Human sign-off required between every pass in A-05, and before A-05 can begin.

## Artifact Format

All pipeline artifacts are written in `.sil` format (EMBER — Semantic Intent Language). Plain text. Human readable without a manual. Git diffable. See the [EMBER spec](https://github.com/semanticintent/project-phoenix) for construct definitions.

## Build Status

**Phase 1 in progress** — Core modules (parser, state, agents, episodes).

```
Phase 1 — Core          src/parser/sil.ts, src/pipeline/state.ts, agents.ts, episodes/manager.ts
Phase 2 — Orchestrator  src/pipeline/orchestrator.ts, src/prompts/loader.ts
Phase 3 — CLI           src/cli/commands/*.ts, bin/phoenix.js
Phase 4 — Tests         tests/ — full coverage before npm publish
```

## Relationship to cal-runtime

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

## License

MIT
