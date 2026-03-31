# phoenix-runtime

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19360782.svg)](https://doi.org/10.5281/zenodo.19360782)
[![npm](https://img.shields.io/npm/v/@semanticintent/phoenix-runtime)](https://www.npmjs.com/package/@semanticintent/phoenix-runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

67 tests · 100% statements · 100% functions · 91% branch coverage

```
Phase 1 — Core          ✓  parser, state, agents, episodes
Phase 2 — Orchestrator  ✓  prompt assembly, artifact validation
Phase 3 — CLI           ✓  init, run, status, gate, episode, validate
Phase 4 — Coverage      ✓  all thresholds met, published to npm
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
