# Project AGENTS.md — [PROJECT_NAME]
# Extends: ~/agent-governance/AGENTS.md
#
# INSTRUCTIONS FOR AGENTS:
# Read ~/agent-governance/AGENTS.md first. All global rules apply unchanged.
# This file contains ONLY project-specific overrides and additions.
# Do not repeat any global rule here.

---

## Global Rules Location

All governance rules live at: `~/agent-governance/AGENTS.md`
All skills live at:           `~/agent-governance/skills/core/`

Read the global AGENTS.md before reading this file.
If it is missing, stop and tell the human.

---

## Project Overview

**Project:** [PROJECT_NAME]
**Language:** [Python / TypeScript / other]
**Entry point:** [e.g., src/main.py or scripts/run.py]
**Environment:** [e.g., conda env name, venv path]
**Test command:** [e.g., pytest tests/ -v]

---

## Model Registry

Canonical model aliases live in `~/agent-governance/config/models.yaml`; see there for current mappings.
Do not restate model IDs here. Project-level overrides list ONLY the roles whose models differ:

```yaml
# overrides vs config/models.yaml (roles not listed inherit global values)
fast-code:
  models: [<model-id>]
```

**Fallback chain** and **rate limit wait** are defined globally in that file and apply unless overridden.

---

## Project Constraints

<!-- Add project-specific hard rules that are not in the global AGENTS.md -->
<!-- Examples below — replace with actual constraints -->

- [METRIC]: [description of key metric and how it is computed]
- [GEOMETRY/DOMAIN CONSTRAINT]: [description]
- [OUTPUT FORMAT]: [required output format or schema]
- [INTEGRATION CONSTRAINT]: [e.g., must not break X pipeline]

---

## Stack Overrides

<!-- Only fill in if this project uses something different from the global stack context -->

- Framework: [e.g., PyTorch 2.x, JAX, etc.]
- Key dependencies: [list critical ones]
- Forbidden packages: [if any]

---

## Project Directory Layout

<!-- Paste the output of `tree -L 2 --dirs-only` here after project init -->

```
[PROJECT_NAME]/
├── docs/
│   ├── ai_context/
│   │   ├── DOC_TAXONOMY.md
│   │   ├── CODEBASE_MAP.md
│   │   ├── SYSTEM_WORKFLOW_MAP.md
│   │   └── AGENT_EXECUTION_LOG.md
│   ├── specs/
│   ├── plans/
│   ├── tasks/
│   └── session_state.md
├── src/
└── tests/
```

---

## Archive Path

`archive/YYYY-MM/<original_path>` — matches global convention. No exceptions.
