---
name: doc-taxonomy
description: >
  Documents the taxonomy of documentation artifacts for this project. Defines
  what every doc type is for, who creates it, when it is updated, and where it
  lives. Read this when uncertain where something belongs or what a doc type
  means.
---

# DOC_TAXONOMY.md
**Location:** `docs/ai_context/DOC_TAXONOMY.md`
**Updated by:** any agent that adds a new documentation artifact.
**Read by:** every agent at session start (listed in CLAUDE.md §1).

---

## Purpose

This document defines what every documentation artifact is for, who creates it,
when it is updated, and where it lives. When in doubt about where something goes
— check here first.

---

## Documentation Hierarchy

```
project-root/
│
├── README.md                          ← Project entry point (human-facing)
├── CLAUDE.md                          ← Agent rules (machine-facing)
├── CONVENTIONS.md                     ← Code style standards
│
├── docs/
│   ├── specs/                         ← WHAT to build
│   │   └── <NNN>_<feature>.md
│   │
│   ├── plans/                         ← HOW to build it
│   │   └── <NNN>_<feature>.md
│   │
│   ├── tasks/                         ← WHAT the agent does, step by step
│   │   └── <NNN>_<feature>.md
│   │
│   ├── ai_context/                    ← Context for agents starting a session
│   │   ├── DOC_TAXONOMY.md            ← This file
│   │   ├── CODEBASE_MAP.md            ← What modules exist and what they own
│   │   └── SYSTEM_WORKFLOW_MAP.md     ← End-to-end pipeline flow (with Mermaid)
│   │
│   └── human_docs/                    ← For humans who haven't read the code
│       ├── system_overview.md
│       ├── how_to_run.md
│       ├── how_to_debug.md
│       └── module_guides/
│           └── <module_name>.md
│
├── <module_name>/
│   └── README.md                      ← Module-local navigation (per module)
│
├── notebooks/
│   └── <feature>_inspection.ipynb    ← Feature understanding + integration surface
│
└── tests/
    └── test_<module>.py              ← Unit tests (function-level contracts)
```

---

## Document Definitions

### `README.md` (project root)
**Purpose:** Entry point for anyone new to the project. What it is, how to run it, where to start.
**Created by:** Human at project start.
**Updated by:** Agent when project-level behavior changes.
**Audience:** Humans.
**Does not contain:** Implementation detail, agent rules, per-feature specs.

---

### `CLAUDE.md` (project root)
**Purpose:** Non-negotiable rules for all coding agents in this project.
**Created by:** Human.
**Updated by:** Human only (never autonomously by an agent).
**Audience:** Coding agents.
**Does not contain:** Human-facing content, per-feature specs.

---

### `docs/specs/<NNN>_<feature>.md`
**Purpose:** Define WHAT to build — requirements, scope, out of scope, validation criteria.
**Created by:** Agent following `SKILL: write-spec`, after human describes the feature.
**Updated by:** Agent if reality diverges from the spec during implementation.
**Status field:** Draft → Confirmed → In Progress → Implemented.
**Audience:** Human (to confirm) + coding agents (to reference).
**Does not contain:** Technical decisions, file paths, implementation steps.
**Skill:** `write-spec`

---

### `docs/plans/<NNN>_<feature>.md`
**Purpose:** Define HOW to build it — layer assignments, file inventory, dependency order.
**Created by:** Agent following `SKILL: write-plan`, after spec is confirmed.
**Updated by:** Agent if implementation decisions change.
**Status field:** Draft → Confirmed → Implemented.
**Audience:** Coding agents.
**Does not contain:** User requirements, validation criteria (those stay in spec).
**Skill:** `write-plan`

---

### `docs/tasks/<NNN>_<feature>.md`
**Purpose:** Define WHAT the coding agent does — phase-ordered micro-tasks with checkpoints.
**Created by:** Agent following `SKILL: decompose-tasks`, after plan is confirmed.
**Updated by:** Agent as tasks complete (`- [x]`). Human if scope changes.
**Audience:** Coding agents (especially open-source/smaller models).
**Does not contain:** Architecture decisions (those stay in plan).
**Skill:** `decompose-tasks`

---

### `docs/ai_context/CODEBASE_MAP.md`
**Purpose:** Single source of truth for what modules exist, what they own, and what
their public entry points are. Includes Mermaid module dependency diagram.
**Created by:** Agent at project initialization.
**Updated by:** Agent after `create-module`, `refactor-module`, or any structural change.
**Audience:** Coding agents (read at session start).
**Does not contain:** Feature specs, implementation steps.
**Skill:** `update-codebase-map`, `update-system-diagram`

---

### `docs/ai_context/SYSTEM_WORKFLOW_MAP.md`
**Purpose:** Visual and prose description of the end-to-end pipeline execution flow.
Includes Mermaid pipeline flowchart.
**Created by:** Agent when the pipeline is first established.
**Updated by:** Agent when pipeline stages change order or new stages are added.
**Audience:** Coding agents (read at session start), humans debugging pipeline.
**Skill:** `update-system-diagram`

---

### `<module>/README.md`
**Purpose:** Per-module navigation — what the module owns, entry points, how to run it,
what not to put here. Includes Mermaid local layer diagram.
**Created by:** Agent following `SKILL: write-module-readme` when module is created.
**Updated by:** Agent when module entry points or internal structure changes.
**Audience:** Coding agents, humans navigating the codebase.
**Skill:** `write-module-readme`, `update-system-diagram`

---

### `docs/human_docs/<file>.md`
**Purpose:** Human-readable explanations of how to run, debug, and understand the system.
Written in terms of behavior and intent — not implementation detail.
**Created by:** Agent following `SKILL: write-human-doc` after major features are built.
**Updated by:** Agent when behavior or workflow changes.
**Audience:** Humans (developers, collaborators, future-you in 3 months).
**Skill:** `write-human-doc`

---

### `notebooks/<feature>_inspection.ipynb`
**Purpose:** Structured demonstration of what a module/feature does. Integration surface.
Shows inputs, intermediate state, outputs, edge cases, and assertions.
NOT a wrapper around one interface call. NOT a unit test suite.
**Created by:** Agent following `SKILL: design-feature-notebook`.
**Updated by:** Agent when module behavior changes.
**Audience:** Humans and agents understanding system behavior.
**Skill:** `design-feature-notebook`

---

### `tests/test_<module>.py`
**Purpose:** Unit tests — function-level contracts. Binary pass/fail. Run in CI.
**Created by:** Agent following `SKILL: write-tests`, during the same phase as implementation.
**Updated by:** Agent when function signatures or behaviors change.
**Audience:** CI pipeline, developers verifying function-level correctness.
**Skill:** `write-tests`

---

### `docs/session_state.md`
**Purpose:** Live state document for coding agent session resume. Always current.
**Created/Updated by:** Agent following `SKILL: handoff-coding-agent`.
**Audience:** The next coding agent session.
**Note:** Always overwritten — not a log. History is tracked via `tasks.md` checkboxes.
**Skill:** `handoff-coding-agent`

---

## What Does NOT Belong in docs/

| Content | Where it actually goes |
|---|---|
| Agent rules | `CLAUDE.md` at project root |
| Module entry points | Module `README.md` |
| Code style | `CONVENTIONS.md` |
| Archived/deprecated code | `archive/YYYY-MM/<original_path>` |
| Execution outputs | `execution_results/` |

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Spec / Plan / Task files | `<NNN>_<snake_case_name>.md` | `003_repair_loop.md` |
| NNN numbering | Zero-padded 3 digits, sequential | 001, 002, 003 |
| Spec, Plan, Task share NNN | Same feature = same number | spec 003, plan 003, tasks 003 |
| Human docs | Descriptive snake_case | `how_to_debug.md` |
| Session state | Always `session_state.md` (no suffix) | `session_state.md` |
