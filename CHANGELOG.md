# Changelog

## [1.0.0] — 2026-04-24

First stable release. All four phases complete, 67 tests, 100% statement coverage. First real-world engagement (wealth2track) completed end-to-end and documented.

### Added
- `examples/` — First engagement documented in README: wealth2track (Flutter/Firebase → React 18 + TypeScript, full pipeline run April 3 2026)
- Episode system validated in production: ep-001 stack pivot injected into A-04, A-05, A-06 automatically

### Changed
- README expanded with real-world engagement table, episode example, certification result, and live link

---

## [0.1.1] — 2026-04-03

### Added
- `phoenix complete` command — records agent completion after out-of-band runs (e.g. Claude Code), resolves issue #3

### Fixed
- Crash guard on missing `confidence` field in `phoenix status` when agent record lacks the field (issue #1, #2)

---

## [0.1.0] — 2026-03-31

Initial release.

### Added
- Phase 1 — SIL parser, pipeline state, agent registry, episode manager
- Phase 2 — Orchestrator, prompt loader, project context injection
- Phase 3 — Full CLI: `init`, `run`, `status`, `gate`, `episode`, `validate`
- Phase 4 — 67 tests, 100% statement coverage, 100% function coverage, 91% branch coverage
- 7 agent prompt files (A-00 through A-06), 1,534 lines total
- Published to npm as `@semanticintent/phoenix-runtime`
- DOI minted: [10.5281/zenodo.19360782](https://doi.org/10.5281/zenodo.19360782)
