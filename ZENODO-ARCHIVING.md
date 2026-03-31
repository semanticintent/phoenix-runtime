# Zenodo Archiving Guide
**Phoenix Runtime — v0.1.0**

---

## When to Deposit

Two deposits planned for this repo:

**Deposit 1 — v0.1.0 (now)**
Architecture spec and Phase 1 implementation.
Timestamps the design and the methodology before npm publish.

**Deposit 2 — v1.0.0 (when npm published)**
Full runtime — all four phases complete, tests passing,
publicly installable. Re-deposit at that point.

---

## Zenodo GitHub Integration

1. Go to https://zenodo.org/account/settings/github/
2. Confirm `semanticintent/phoenix-runtime` is enabled
   (make repo public before enabling — Zenodo requires public)
3. Create a release:

```
Tag:    v0.1.0
Title:  Phoenix Runtime v0.1.0 — Seven-Agent Pipeline Orchestrator
```

Zenodo auto-mints a DOI on release.

---

## Zenodo Metadata

Fill in this metadata when creating the deposit:

```
Title:
  Phoenix Runtime: Orchestration Layer for the
  Seven-Agent Legacy Modernization Pipeline

Authors:
  Michael Shatny (ORCID: 0009-0006-2011-3258)

Version: 0.1.0
License: MIT
Date:    2026-03-31

Resource type: Software

Description:
  Phoenix Runtime is the CLI orchestration layer for Project Phoenix —
  a seven-agent agentic pipeline for legacy system modernization.
  Manages .sil artifact state, enforces human gates between build passes,
  injects episode context into every agent run. Model-agnostic — produces
  contextualized prompts rather than calling AI APIs. Seven agents:
  A-00 Signal Extraction through A-06 Validator & Certifier.
  Built on EMBER Semantic Intent Language (.sil).
  TypeScript. MIT. npm: @semanticintent/phoenix-runtime. bin: phoenix.

Keywords:
  phoenix, legacy-modernization, agent-pipeline, ember, sil,
  semantic-intent, methodology-as-infrastructure, typescript, cli, npm

Related identifiers:
  Is part of → 10.5281/zenodo.18904231  (project-phoenix)
  Cites      → 10.5281/zenodo.18946631  (methodology-as-infrastructure)
  Cites      → 10.5281/zenodo.18905193  (cal-runtime)
  Cites      → 10.5281/zenodo.18905197  (cal language spec)
```

---

## After DOI Is Minted

Update these files with the assigned DOI:

- [ ] `CITATION.cff` — add `doi:` field
- [ ] `README.md` — add DOI badge at top:
  ```
  [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX)
  ```
- [ ] `project-phoenix` ZENODO-ARCHIVING.md — update runtime DOI
- [ ] `project-phoenix` README — cross-reference runtime DOI
- [ ] Zenodo: add runtime DOI as related to EMBER spec DOI

---

## DOI Ecosystem Position

```
project-phoenix          DOI: 10.5281/zenodo.18904231
  ├── phoenix-runtime    DOI: [this deposit]
  └── EMBER spec         DOI: [separate deposit]

methodology-as-infra     DOI: 10.5281/zenodo.18946631
  └── cites both phoenix-runtime and EMBER spec

cal-runtime              DOI: 10.5281/zenodo.18905193
  └── sibling runtime — same pattern, different methodology
```

---

*Archiving guide — March 2026*
*Make repo public before Zenodo integration*
