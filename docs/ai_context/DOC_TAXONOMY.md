# Documentation Taxonomy

**Location:** `docs/ai_context/DOC_TAXONOMY.md`
**Audience:** Contributors, maintainers, and coding agents
**Purpose:** Identify the canonical home and purpose for each documentation type in this repository.

## Documentation map

| Artifact | Location | Purpose | Update when |
|---|---|---|---|
| Project entry point | `README.md` | Explain the project, its main components, getting started, and validation | Project purpose or entry points change |
| Agent rules | `AGENTS*.md`, `CLAUDE.md` | Define behavior and workflow for coding agents | Governance rules change |
| Code conventions | `CONVENTIONS.md` | Concrete style and formatting contract | Code standards change |
| System briefing | `SYSTEM_OVERVIEW.md` | Compact machine-oriented orientation to the governance system | Rules, skills, or workflow materially change |
| Codebase map | `docs/ai_context/CODEBASE_MAP.md` | Module ownership, entry points, dependency/use map, known gaps | Repository structure or responsibilities change |
| Workflow map | `docs/ai_context/SYSTEM_WORKFLOW_MAP.md` | End-to-end development workflow and gates | Stage order or gate behavior changes |
| Execution log | `docs/ai_context/AGENT_EXECUTION_LOG.md` | Durable record of attempts, results, and lessons | After each task attempt |
| Session state | `docs/session_state.md` | Current resumable state; not a historical log | At session handoff or material task completion |
| Specs | `docs/specs/` | Requirements, scope, and acceptance criteria | Requirements change or implementation diverges |
| Plans | `docs/plans/` | Approved technical approach and file/dependency plan | Implementation approach changes |
| Tasks | `docs/tasks/` | Ordered, verifiable execution work | Tasks or checkpoints change |
| Audits | `docs/audits/` | Evidence-based diagnostic findings | A new audit is completed |
| Human guides | `docs/human_docs/` | How the system behaves, runs, and is debugged | User-facing behavior or workflow changes |
| Reusable skills | `skills/` | Agent procedures and task-specific workflows | A procedure is improved or corrected |
| Templates | `templates/` | Starting points for governed project artifacts | Template contract changes |
| Plugin guide | `codex-plugin-cc/README.md` | Install and use the bundled Claude Code/Codex plugin | Plugin commands or requirements change |
| Contribution guide | `CONTRIBUTING.md` | Local checks and contribution expectations | Contributor workflow changes |
| Security policy | `SECURITY.md` | Private reporting guidance | Reporting channel or policy changes |

## Source-of-truth rules

- `AGENTS.md` and its role-specific extensions define agent behavior; the README summarizes but does not override them.
- `config/models.yaml` is the canonical model-role registry. Do not copy current model IDs into general guidance.
- `docs/ai_context/AGENT_EXECUTION_LOG.md` is the historical record; `docs/session_state.md` is the current handoff state.
- Specs say what and why; plans say how; task files define verifiable execution steps.
- The README for `codex-plugin-cc/` is authoritative for that plugin's install and command details.
- The plugin's nested license and notices apply to that component as stated there. This repository has no root-level license; do not infer one.

## Audience boundary

- Root README and `docs/human_docs/` are for human readers.
- `AGENTS*.md`, skills, templates, and `docs/ai_context/` primarily support agent operation and maintenance.
- Specs, plans, and tasks support both human approval and controlled execution.
