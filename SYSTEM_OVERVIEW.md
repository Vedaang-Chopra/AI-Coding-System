# Agent Governance System Overview

> **Purpose:** Share this file with any AI chatbot to brief it on this agent governance system —
> rules, skills, workflow, and forbidden patterns. Written for an AI reader, not a human.
> Keep this file updated as the system evolves.
>
> **Last updated:** 2026-07-11

---

## Quick Navigation

| Section | What's in it |
|---|---|
| [§1 What This System Is](#1-what-this-system-is) | One-paragraph orientation |
| [§2 How to Load Rules](#2-how-to-load-rules) | Where rule files live, how projects extend them |
| [§3 Core Behavioral Rules](#3-core-behavioral-rules) | Always-on constraints for any agent |
| [§4 Hard Stops](#4-hard-stops) | Commands that require human confirmation |
| [§5 Implementation Workflow](#5-implementation-workflow) | Ordered sequence with hard gates |
| [§6 5-Layer Architecture](#6-5-layer-architecture) | Module structure model, non-negotiable |
| [§7 Documentation Structure](#7-documentation-structure) | Required files every project maintains |
| [§8 Core Skills (26)](#8-core-skills-26) | Trigger → Produces → Key gates, per skill |
| [§9 Utility Skills (5)](#9-utility-skills-5) | Token compression, debugging, teaching |
| [§9b Optional Skills (0)](#9b-optional-skills-0) | Opt-in tier, currently empty |
| [§10 Forbidden Patterns](#10-forbidden-patterns) | What an agent must never do |
| [§11 Task Model Hints](#11-task-model-hints) | How tasks annotate model selection |
| [§12 Change Report](#12-required-change-report) | Required output after every task |

---

## 1. What This System Is

`~/agent-governance/` is a personal governance repository that controls how AI agents (Claude Code, Pi, Codex) behave across all projects. It is the single source of truth for: behavioral rules, git safety constraints, a 5-layer architecture model, an ordered implementation workflow, and a skill library. Projects extend the global rules via local `AGENTS.md` files — they never duplicate global content. The system is documentation-first and phase-gated: no code before discovery, no implementation before spec + plan + tasks are confirmed by the human.

**Skill count (kept broken out by tier — a single blanket figure has gone stale before):** 26 core + 5 utility + 0 optional = **31 active skills**. The optional tier (`skills/optional/`) exists for future opt-in, per-project skills but currently has none — its last occupants (an `mcp-graph` integration) were archived when their MCP dependency was retired (see §9b). One additional skill is staged for relocation out of this repo entirely, not counted above (see §9b).

---

## 2. How to Load Rules

| What | Where |
|---|---|
| Universal rules (all agents) | `~/agent-governance/AGENTS.md` |
| Planning rules (Claude Code / Codex only) | `~/agent-governance/AGENTS.planning.md` |
| Execution rules (Pi, `fast-code` role only) | `~/agent-governance/AGENTS.execution.md` |
| Project overrides | `<project-root>/AGENTS.md` — extends global, no duplication |
| Template for new projects | `~/agent-governance/templates/project-AGENTS.md` |
| Core skills (25) | `~/agent-governance/skills/core/<skill-name>/SKILL.md` |
| Utility skills (6) | `~/agent-governance/skills/utility/<skill-name>/` |

**Stack context:** Python (ML/RL/research), TypeScript/Node, occasionally Bash. For project-specific stack, read the project `AGENTS.md` first. If none exists, ask.

---

## 3. Core Behavioral Rules

- Read relevant local files before searching the web. Prefer codebase knowledge.
- Explain what you are about to do before running any destructive command.
- Do not install packages globally without asking.
- Do not modify files outside the current project root.
- When research is needed online: fetch and summarize — do not just link.
- Write simple, direct code. No over-engineering. No AI-slop comments.
- **Git:** `git status` before modifying tracked files → commit after each logical task (`git commit -m "agent: <description>"`) → for risky operations create a branch (`git checkout -b agent/<task-name>`)
- **Output discipline:** never print secret values or API keys in bash output; truncate large stdout; if stuck after 2 iterations, stop and report findings instead of guessing.

---

## 4. Hard Stops

Always confirm with the human before executing any of these:

- `rm -rf`
- `git push`, `git reset --hard`, `git clean -fd`
- `sudo` anything
- Any command writing to directories above the project root
- Any command touching `.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`

---

## 5. Implementation Workflow

Ordered. Non-negotiable. Never skip or reorder steps.

```
discover-codebase
    ↓
write-spec          → OUTPUT: docs/specs/NNN_feature.md
    ↓ *** HARD STOP — do not continue until human explicitly approves ***
write-plan          → OUTPUT: docs/plans/NNN_feature.md
    ↓ *** HARD STOP — do not continue until human explicitly approves ***
decompose-tasks     → OUTPUT: docs/tasks/NNN_feature.md
                             + docs/execution-plans/NN-seq-exec-prompt.md
    ↓ *** HARD STOP — do not continue until human explicitly approves ***

plan-pi-execution   → (only if any task hinted fast-code/local)
                      OUTPUT: docs/specs/pi_agent_tasks/<group_id>/GROUP.md per group
    ↓ *** GATE — group's understanding checkpoint (notebook + Python integration
         test, authored by the planning agent) must exist before the NEXT
         group may dispatch. Not required for groups marked exempt. ***

[Pi receives execution prompt:]
  PRE-FLIGHT: docs/tasks/ non-empty? AGENT_EXECUTION_LOG read? → if no: STOP

[For each phase:]
  implement-feature task(s)
  add-observability
  write-tests + Python integration test
  verify-checkpoint      ← HARD GATE: fix all failures before Phase N+1
  [if stopping session:] handoff-coding-agent

design-feature-notebook + tests/integration/test_*.py
update-codebase-map
update-system-diagram
update-docs

self-check (§12 of AGENTS.md)
write to docs/ai_context/AGENT_EXECUTION_LOG.md
```

**Rules:**
- Never write code before steps 1–3 complete and confirmed by human.
- Implement one task at a time. Never mark `[x]` before Verify step passes.
- Never start Phase N+1 before Phase N checkpoint passes.
- If implementation diverges from plan → update plan before continuing.

---

## 6. 5-Layer Architecture

Every module follows this model. State which layer each component belongs to before writing code.

```
Layer 1 — Notebooks        Inspection, debugging, integration testing surface.
                            No production logic. Calls production code only.
Layer 2 — Public Interface  interfaces.py / api.py / runners.py
                            Thin, typed, documented entry points.
Layer 3 — Orchestration     Workflow composition. Stage ordering.
                            Calls core. Does not implement algorithms.
Layer 4 — Core              Implementation logic, algorithms, feature behavior.
Layer 5 — Schemas / Utils   Data contracts, config, stateless helpers.
```

**Invariants:**
- No lower layer imports from a higher layer.
- No circular imports.
- Schemas defined once — never duplicated.
- Shared utilities go in project-level `utils/`, not buried in a feature module.
- External consumers import only from Layer 2 (`interfaces.py`, `api.py`, `runners.py`).

---

## 7. Documentation Structure

Required files every project should maintain:

| File | Purpose |
|---|---|
| `docs/ai_context/DOC_TAXONOMY.md` | What every doc type is for and where it lives |
| `docs/ai_context/CODEBASE_MAP.md` | Module ownership, entry points, Mermaid dependency diagram |
| `docs/ai_context/SYSTEM_WORKFLOW_MAP.md` | End-to-end pipeline flowchart |
| `docs/ai_context/AGENT_EXECUTION_LOG.md` | Cross-session agent log — **read before starting any task, write after finishing** |
| `docs/ai_context/pi_agent_tooling_guide.md` | Operator guide for external coding agents using this Pi setup |
| `docs/specs/NNN_feature.md` | Feature requirements: WHAT + WHY (not HOW) |
| `docs/plans/NNN_feature.md` | Technical plan: HOW (architecture, layer assignments, file inventory) |
| `docs/tasks/NNN_feature.md` | Executable agent task list with model hints, parallel groups, verify commands |
| `docs/execution-plans/NN-seq-exec-prompt.md` | Sequential execution prompt for agent handoff |
| `docs/session_state.md` | Current implementation state — overwritten each session, never appended |
| `docs/human_docs/` | User-facing documentation (behavior + intent, not implementation) |

Templates live at `~/agent-governance/templates/`.

---

## 8. Core Skills (26)

Each entry: **what it does** | **when to invoke** | **what it produces** | **key gates**.

---

### `discover-codebase`
**What:** Understand what exists before writing code. Prevents duplicate logic and wrong module placement.

**Invoke when:** Before writing ANY new code or creating ANY new file. Always run first, even for small tasks.

**Produces:** Explicit answers to 6 questions (must be stated before writing anything):
1. Does similar functionality already exist?
2. Which module owns the behavior I need to implement?
3. Can I extend/update existing code instead of creating new files?
4. Is logic specific to one module, or shared across many?
5. Which files will my change affect?
6. Are there existing tests or notebooks that cover this area?

**Key gates:**
- Must read `docs/ai_context/CODEBASE_MAP.md` fully.
- For each module to be touched, read its local `README.md`.
- Search for similar functionality by name, class name, AND conceptual synonym.
- All 6 questions must be answered explicitly — cannot skip to implementation.

---

### `write-spec`
**What:** Define WHAT to build and WHY (not HOW). Contract between human intent and agent implementation.

**Invoke when:** Before implementing any substantial feature, refactor, schema change, or workflow change. Always before `write-plan`.

**Produces:** `docs/specs/<NNN>_<feature_name>.md` (NNN = next sequential 3-digit number)

**Key gates:**
- Do not write plan until spec confirmed by human.
- "Out of Scope" section REQUIRED — empty = incomplete spec.
- Acceptance Criteria must be observable and testable: `"Given X input, module produces Y output"` — not descriptions of internal code.
- Open Questions must be RESOLVED before plan begins; if unresolved, Status stays Draft.
- Status lifecycle: Draft → Confirmed → In Progress → Implemented.
- 6 required sections: Purpose, Affected Modules, Out of Scope, Acceptance Criteria, Validation Plan, Known Risks/Open Questions.
- If implementation diverges from spec → update spec to match reality.

---

### `write-plan`
**What:** Convert spec's WHAT into technical HOW — architecture decisions, layer assignments, file inventory, dependency order.

**Invoke when:** After `write-spec` confirmed by human. Before `decompose-tasks`.

**Produces:** `docs/plans/<NNN>_<feature_name>.md` (same number as corresponding spec)

**Key gates:**
- Never write plan without reading spec first.
- If plan reveals spec is ambiguous → fix spec before finishing plan.
- Plan confirmed by human before `decompose-tasks` runs.
- 7 required sections: Summary, Layer Assignment, Files to Create, Files to Modify, Dependency Order (schemas first → core → orchestration → interface → tests → notebook), Integration Points, Risks and Open Questions, Validation Criteria.
- Every new file must have stated layer and purpose.
- Every component maps to exactly ONE layer.
- If two components want same file but different layers → design error, split file.
- Plan is a living document: if implementation diverges → update plan, do not leave stale.
- Points to (does not restate) `decompose-tasks`'s phase-sizing rule and Type A/Type B test-type decision.

---

### `decompose-tasks`
**What:** Break down approved plan into executable agent tasks with specific what/where/how/model/verify for each.

**Invoke when:** After `write-plan` is confirmed by human. Before writing any code.

**Produces:**
- `docs/tasks/NNN_feature_name.md`
- `docs/execution-plans/NN-seq-exec-prompt.md` (mandatory, produce after human approval of tasks)

**Key gates:**
- Every task MUST include: Phase, Parallel group, Depends on, Model hint, Rate limit flag, Fallback model, Layer, File(s), What to build, Function signatures, Input/output shape, Verify command, Checkpoint reference, AGENT_EXECUTION_LOG notes.
- Dependency analysis table REQUIRED before assigning parallel groups.
- Every phase MUST end with a `verify-checkpoint` task.
- Every parallel group MUST have a sync point immediately after it.
- Free-tier model tasks in the same parallel group must be staggered or reassigned to different models.
- **Canonical home of the phase-sizing rule:** a phase is one demonstrable
  capability, sized by the one-sentence boundary test "once every task in
  this phase is done, what can the system now demonstrably do that it
  couldn't before?" — stated in full in `decompose-tasks/SKILL.md` §3;
  `plan-pi-execution`'s group boundary test points here rather than
  restating it.
- Every phase must state a **Type A** decision (always applies —
  `write-tests`) and a **Type B** decision (yes/no + one-line reason —
  checkpoint-mode notebook via `design-feature-notebook`, satisfied by
  existing group-level files when the phase's tasks ran through
  `plan-pi-execution`).
- **Checkpoint Coverage Audit must pass before outputting tasks:**
  - Every touched module has a task for `interfaces.py`
  - Every required output file has an owning task
  - Every spec behavior appears in ≥1 task
  - Every phase has a `verify-checkpoint` task
  - Every parallel group has a sync point
  - All FAILED patterns from `AGENT_EXECUTION_LOG.md` noted in affected tasks
  - Every phase maps to one stated capability, not a task count
  - Every phase states a Type A/B decision with reason

---

### `plan-pi-execution`
**What:** Cluster `fast-code`/`local`-hinted tasks into pi execution groups sized by one demonstrable capability, and gate the next group's dispatch on a mandatory understanding checkpoint.

**Invoke when:** After `decompose-tasks`, only if any task is hinted `fast-code`/`local`. Before dispatching any task through `execute-tasks-with-pi`.

**Produces:** `docs/specs/pi_agent_tasks/<group_id>/GROUP.md` per group; `notebooks/understanding/<group_id>.ipynb` + `tests/integration/test_<group_id>_integration.py` per non-exempt group, authored by the planning agent.

**Key gates:**
- Boundary test is `decompose-tasks`'s canonical phase-sizing rule (§3),
  applied to the subset of a phase's tasks that are Pi-dispatched — a
  group is a Pi-specific refinement nested inside a phase, not a
  separately defined unit.
- Every pi-bound task belongs to exactly one `group_id`; no group depends on a later group.
- `execute-tasks-with-pi`'s `<group>` folder name must match `group_id` exactly.
- Understanding checkpoint (notebook + Python integration test) is mandatory before the next group may be marked `[done]`, unless the group is marked `exempt` with a stated reason (no observable behavior change). The notebook is `design-feature-notebook`'s checkpoint mode, scoped to the group's capability.
- Pi never authors the understanding checkpoint — Claude Code writes both files directly from pi's already-verified diffs and run outputs.
- Understanding checkpoint never replaces `verify-checkpoint`'s mechanical correctness gate, and vice versa — both are required, independent gates.

---

### `execute-tasks-with-pi`
**What:** Dispatch individual `fast-code`/`local`-hinted tasks from `docs/tasks/` to the pi CLI one atomic task per non-interactive invocation, with independent re-verification and a durable JSON run log — an alternative to `decompose-tasks`'s own long-session Sequential Execution Prompt.

**Invoke when:** After `decompose-tasks` (and, if the task is pi-bound, after `plan-pi-execution` has clustered it into a group). Before dispatching any `fast-code`/`local` task, when the execution model has a known reliability gap on compound instructions and a per-task verification checkpoint is wanted instead of trusting a longer autonomous run.

**Produces:** One `task-N.md` / `test-N.md` pair per atomic task; append-only JSON run log at `docs/specs/pi_agent_tasks/pi_run_log.json`; per-task NDJSON output captured via `tools/pi_agent/run_pi_task.py`.

**Key gates:**
- Never call `pi` directly and check `$?` — its process exit code is not a reliable success signal. Always dispatch through `run_pi_task.py` and check `agent_end_seen` instead.
- One atomic task per dispatch: one file, one change, one explicit constraint list, one verification command (or short fixed list) — split further than seems necessary for a small/unreliable execution model.
- Independent verification is mandatory after every task — a second LLM's self-report ("yes it passed") is not evidence; the verification prompt must demand complete verbatim command output, not a summary.
- `<group>` folder name must match `plan-pi-execution`'s `group_id` exactly.
- Log every dispatch (execution and verification) as its own record in the JSON run log; link a verification run's `run_id` back to the execution run it checked.

---

### `implement-feature`
**What:** Orchestrate the full workflow from discovery to verified, documented feature.

**Invoke when:** Starting implementation of any substantial new feature. Resuming after stopped session (read `session_state.md` first).

**Produces:** Complete feature implementation following the §5 workflow.

**Key gates:**
- Never write code before discover → spec → plan → decompose complete and confirmed.
- Implement one task at a time.
- Never mark task `[x]` before its Verify step passes.
- Never start Phase N+1 before Phase N checkpoint PASSES.
- Do not silently expand scope — flag in `session_state.md`.
- One task = one focused change.

---

### `add-observability`
**What:** Add structured logging and human-readable tracing at pipeline boundaries.

**Invoke when:** Adding logging/tracing to any module or notebook. Adding a new pipeline stage or notebook section.

**Produces:**
- Module-level `logger = logging.getLogger(__name__)` setup
- Structured logging at Stage Entry/Exit
- Human-readable `[STAGE Name]` print blocks in notebooks with entry + exit summaries

**Key gates:**
- **Two-layer model required:** Layer 1 = structured logs for machines; Layer 2 = human-readable print blocks.
- **Reversal Rule:** Remove all mechanical `start/done` logs BEFORE adding meaningful observability.
- **Named parameters only:** Log lines must use actual parameter names — never `arg0`, `arg1`. Decorators must bind via `inspect.signature()`.
- **Log level by call context:** Stage boundaries → `INFO`; per-item inside loops → `DEBUG` only; leaf utility functions called from loops → no logging; batch summary after loop → `INFO`.
- **Loop aggregation required:** Do not log inside loops at `INFO`. Log the count/summary after the loop completes.
- **INFO line content standard:** Every `INFO` line at a stage boundary must include function/stage name + at least one named input value + at least one named output value or count.
- No `print()` in production modules — use `logging`.
- Third-party loggers must be suppressed explicitly at initialization.
- Stage-level granularity only — NOT per-function logging.
- 10-point acceptance criteria: data flow visible, control decisions explicit, counts before/after transforms, anomalies with context, no helper entry/exit logs, verbose/debug opt-in, readable output, third-party suppressed, no business logic changes, no start/done pairs.

---

### `write-tests`
**What:** Write function-level contract verification with binary pass/fail outcomes.

**Invoke when:** Writing unit tests for functions/classes. Any phase with a Verify step requiring pytest. When a public function's behavior changes.

**Produces:** `tests/test_<module_name>.py` (or `tests/test_<module>_<submodule>.py` for large modules)

**Key gates:**
- Write tests IN SAME PHASE as implementation — never after.
- Required test categories per module: happy path, edge case (empty/boundary), failure case (wrong type → expected exception).
- If function has >3 distinct behaviors → each gets own test.
- Import ONLY from public interface (`interfaces.py`, `api.py`, `runners.py`) — never from `core/`.
- No test depends on state from another test.
- No test calls real external service, real model, or real filesystem path — mock everything external.
- Naming: `test_<function>_<scenario>`.
- Clean run required: `pytest tests/test_<module>.py -v` passes.

---

### `verify-checkpoint`
**What:** Hard gate at end of phase — surfaces defects before they compound into next phase.

**Invoke when:** At end of every development phase before proceeding to Phase N+1. Phase is NOT done when code is written — phase is done when checkpoint PASSES.

**Produces:** Checkpoint verification output table + updated `docs/session_state.md`

**Key gates:**
- Run EVERY item in checkpoint block — no skipping.
- Record for each: result (PASS/FAIL), actual output, notes.
- If ANY item FAILS: STOP, identify which task produced failure, return to task, fix it, re-run FULL checkpoint from item 1.
- Do NOT mark any checkpoint item passed until entire block passes.
- If all PASS and "Human sign-off required: YES" → STOP and wait for confirmation.
- Valid checkpoint items only: binary pass/fail, mechanically runnable (`pytest`, `python -m`, import checks, file exists, grep). NOT valid: "looks correct", "should be working", "no obvious errors".
- Confirm Type A (`write-tests`) passes for the phase; if Type B was
  stated, confirm the checkpoint-mode notebook (or, for pi-execution-group
  phases, the existing group-level notebook + integration test) exists and
  runs top-to-bottom — a missing promised notebook is a FAIL item.

---

### `design-feature-notebook`
**What:** Structure Jupyter notebooks as understanding and integration testing surfaces — NOT thin wrappers around one function call.

**Invoke when:** Creating a new notebook for any feature/module/workflow. Updating notebook after feature changes.

**Produces:** Two modes in one file. Feature-completion mode (existing): Jupyter notebook with 10 required sections, produced once when a feature is complete, with a mandatory Python equivalent at `tests/integration/test_<feature>_integration.py` — runnable via pytest, authoritative test, same assertions. Checkpoint mode (new): lightweight, sequential, per-phase notebook with no fixed section count, produced only when `decompose-tasks` states Type B applies for that phase; also used by `plan-pi-execution`'s group-level understanding notebook.

**Key gates:**
- **Stage function pre-check (gate before writing):** Enumerate all workflow stages. Every stage must have a callable function in the interface. If any stage lacks one, fix the Tier 1 interface first — do not write the notebook and do not import from `core/` as a workaround.
- **Workflow templates:** Use the data/ML template (load → preprocess → split → train → save) or agentic/LLM template (load_traces → segment → normalize → annotate → aggregate) as the scaffold. Each stage = one or two cells; each cell = one function call + display.
- **Minimum 5 substantive stage cells** (excluding setup and summary) — INCOMPLETE if fewer.
- **Forbidden (REJECT, redesign):** Notebook calls only one function from `interfaces.py` and displays output; notebook imports from `core/` to enable stage inspection.
- 10-section structure REQUIRED: (1) Purpose, (2) Setup, (3) Test Inputs, (4) Public Entry Point Check, (5) Stage-by-Stage Inspection, (6) Assertions ≥3, (7) Edge Cases/Failure Cases ≥1, (8) Artifacts/Output Inspection, (9) Debugging Notes, (10) Summary table.
- Each section MUST have `[STAGE]` print block (entry + exit per `add-observability`).
- Assertions required — not optional.
- At least one failure case REQUIRED (not happy path only).
- Cells run top-to-bottom with no hidden state.
- Import only from public entry points — never from `core/`.
- Clear outputs before committing (unless saved report).
- **Checkpoint mode** does not require the 10-section structure, the ≥5
  stage-cell minimum, or the ≥3-assertion minimum — it exists to let a
  human understand what a phase built, not to serve as the full
  feature-completion artifact.

---

### `design-layered-module`
**What:** Enforce the 5-layer architecture within a module before writing code, including a two-tier interface model for Layer 2.

**Invoke when:** Creating new module or feature. Editing existing multi-file module. Adding/changing `runners.py`, `interfaces.py`, or `api.py`. Refactoring flat directory. Moving logic between layers.

**Produces:** Layer plan document mapping every component to one of the 5 layers.

**Key gates:**
- Layer plan MUST be written before implementation.
- **Two-tier interface model (Layer 2):**
  - Tier 1 — subdirectory-level `interfaces.py` files: step-granular, one function per stage, for notebooks to import. Each subdirectory with meaningful stages gets its own `interfaces.py`.
  - Tier 2 — module-level `interfaces.py`: pipeline-granular, composes Tier 1 calls, for automation and external modules. Must NOT call `core/` directly.
  - **Violation pattern:** module-level `interfaces.py` wrapping a single internal function is a design error — it means Tier 1 is missing. Fix before writing a notebook.
- Layer ownership rules:
  - Notebook: inspection/examples/visualization only — imports from Tier 1 interfaces, never from `core/`
  - Interface/Runner: public entry points + thin orchestration — no algorithms, no large workflow logic
  - Orchestration: workflow composition + stage ordering — no low-level algorithms, no duplicated schemas
  - Core: implementation logic + algorithms — no public API sprawl, no notebook-specific display
  - Schemas/Utils: data contracts + helpers — no high-level feature workflows
- No lower layer imports from higher layer.
- No circular imports.
- Schemas defined once only.

---

### `design-python-code`
**What:** Apply SOLID principles and OOP design decisions to code within a layer, including four named detection-trigger patterns for when flat functions must become classes.

**Invoke when:** Writing any new class. Deciding class vs function. Adding significant logic. Directory growing and needs internal organization. Task producing 2+ new Python files in same directory.

**Produces:** Class/function design decisions with SOLID justification + directory grouping plan + OOP pattern selection.

**Key gates:**
- CLASS when: shared state across methods, multiple implementations of same interface, lifecycle/resource management, complex shared config.
- FUNCTION when: stateless transformation, single utility operation, would be one-method class, globally reusable.
- **Four named OOP patterns (apply when detection trigger is present):**
  - **Registry** — trigger: function loads from disk and is called >1× per execution path → class with `__init__` loading once, query methods only.
  - **Cache-bearing object** — trigger: module-level cache dict checked before expensive ops → `self._cache` on a class that owns load/lookup/save.
  - **Config/Paths dataclass** — trigger: 3+ related Path or config values as separate function args → `@dataclass` grouping all fields.
  - **Strategy/Protocol** — trigger: `if/elif` or `isinstance()` dispatch on type tag → `Protocol` + injected implementation, dispatch removed.
- SOLID in order: S (one reason to change) → O (no `isinstance()` chains, use polymorphism) → L (subclass substitutable for parent) → I (Python Protocols, no fat ABCs) → D (depend on abstractions, inject dependencies).
- Composition over inheritance by default.
- Dataclass for data containers (not manual `__init__`).
- Directory subdirectories by DOMAIN CONCEPT, not by type (`evaluation/` not `classes/`).
- Create subdirectory when: 3+ files share domain concept OR many unrelated files.

---

### `design-runner`
**What:** Design pipeline orchestration keeping it strictly separate from implementation logic.

**Invoke when:** Designing, writing, or refactoring any `runners.py` or pipeline orchestration file.

**Produces:** `runners.py` with clean orchestration pattern.

**Key gates:**
- One function per stage: single responsibility, typed I/O, one-sentence docstring.
- `run_full_pipeline()` is a CALL LIST ONLY — no logic, no conditionals, only calls stage functions in sequence.
- Every stage independently callable (no reliance on pipeline context).
- No conditionals in `run_full_pipeline()` — extract to stage function.

---

### `create-module`
**What:** Scaffold new module/subdirectory with correct boundary, ownership, and public interface layer before any code.

**Invoke when:** Creating a new module or major subdirectory. Always use even when structure seems obvious — skipping leads to missing interface layers.

**Produces:**
- Directory: `module_name/`, `README.md`, `interfaces.py`, `runners.py`, `schemas/`, `core/`, `utils/`
- Updated `docs/ai_context/CODEBASE_MAP.md` entry

**Key gates:**
- Run `discover-codebase` first to confirm no duplication.
- Define module's single responsibility in ONE SENTENCE before creating any files.
- Public entry points defined in `interfaces.py` — external consumers never import from `core/`.
- If logic is reusable across modules → extract to project-level `utils/` immediately.

---

### `parallel-execution`
**What:** Design parallel task groups during decomposition, validating no data dependencies between concurrent tasks.

**Invoke when:** During `decompose-tasks` when some tasks can execute concurrently.

**Produces:** Dependency analysis table + parallel group notation in task file.

**Key gates:**
- Task group parallelizable ONLY if ALL three true: (1) no task reads file written by another in group, (2) no shared schema/config modified, (3) tests run against own outputs only.
- Dependency analysis table REQUIRED before grouping (columns: Task, Reads from, Writes to, Depends on tasks).
- No parallel groups for tasks writing to same file.
- Do NOT use parallel groups to avoid human review gates at phase boundaries.
- HARD STOP if ANY task in group failed — do not proceed, fix or escalate.

---

### `refactor-module`
**What:** Restructure existing module without adding new behavior.

**Invoke when:** Structural improvement tasks: renaming, deduplication, adding interface layer, reorganizing directories.

**Produces:** Separate commits per step: Naming → Directory structure → Interface layer → Logic deduplication.

**Key gates:**
- Run `discover-codebase` first — do not refactor blind.
- State explicitly what is structurally wrong before writing a line.
- Write refactor plan before touching any code.
- Strict step order, EACH STEP = separate commit.
- After each step: verify existing tests and notebooks still run.
- Move replaced files to `archive/` using `deprecate-code` skill.
- Run `update-docs` after complete.

---

### `deprecate-code`
**What:** Archive deprecated code with traceable headers instead of deleting.

**Invoke when:** Removing, replacing, or retiring any file, module, function, or class. Before deleting or overwriting anything.

**Produces:** Files moved to `archive/<YYYY-MM>/<original_relative_path>` with ARCHIVED header.

**Key gates:**
- NEVER delete code in place.
- Search entire codebase and fix ALL imports/references before archiving.
- Add header: `# ARCHIVED: YYYY-MM-DD\n# Reason: ...\n# Replaced by: ...\n# Safe to delete after: YYYY-MM-DD`
- Deletion from `archive/` allowed ONLY when: replacement validated in production + no imports reference it + ≥1 full working session without issues.

---

### `update-codebase-map`
**What:** Keep `docs/ai_context/CODEBASE_MAP.md` current — stale map misdirects every future agent.

**Invoke when:** After creating, renaming, restructuring, or deleting any module/directory/public API. Before closing any task that touched module structure.

**Produces:** Updated `CODEBASE_MAP.md` with Mermaid diagram + ownership/entry points/shared utils/schemas/inventory/gaps/changelog tables.

**Key gates:**
- Update Mermaid diagram FIRST.
- Mermaid: nodes = modules/major directories (NOT individual files); edges = import dependencies; `graph TD`; >12 nodes → break into subsystem diagrams.
- Check EVERY section even for unaffected areas — structural changes have ripple effects.
- 10-section checklist: diagram updated, new modules in ownership table, removed modules deleted from ALL tables, entry points current, shared utils updated, schemas updated, "What NOT to Duplicate" updated, inventory current, Known Gaps updated, Changelog entry added.

---

### `update-system-diagram`
**What:** Keep Mermaid diagrams current in all three required locations.

**Invoke when:** After any structural change to module relationships, pipeline order, or public APIs.

**Produces:** Updated diagrams in:
1. `docs/ai_context/CODEBASE_MAP.md` — Module Dependency Graph
2. `docs/ai_context/SYSTEM_WORKFLOW_MAP.md` — Pipeline Flowchart
3. Module `README.md` — Local Layer Diagram

**Key gates:**
- CODEBASE_MAP: module-level dependency tree (`graph TD`), nodes = modules/major dirs.
- SYSTEM_WORKFLOW_MAP: end-to-end execution flow (`flowchart LR`), label all non-default edges, show loops/retries.
- Module README: internal layers (`flowchart TD`), local only, nodes = files/dirs.
- Diagrams must reflect ACTUAL CODE, not design intentions.
- If >15 nodes, break into subsystem diagrams.
- Update ALL affected diagrams in same change set.

---

### `update-docs`
**What:** Keep documentation in sync with implementation — docs belong in same change set as code.

**Invoke when:** After any implementation changing behavior, structure, public APIs, schemas, or configs. Before finalizing any task.

**Produces:** Updated documentation files as needed.

**Key gates:**
- 6-question checklist — any "yes" triggers action:
  1. Did module structure change? → update `CODEBASE_MAP.md` (use `update-codebase-map`)
  2. Did public APIs change? → update `interfaces.py` docstrings + relevant specs
  3. Did schemas/configs change? → update spec + `CODEBASE_MAP.md`
  4. Did module purpose or entry points change? → update local `README.md`
  5. Does spec match implementation? → if not, update spec to reflect reality
  6. Does `docs/human_docs/` need updating? → use `write-human-doc`
- All updates in same change set as implementation.

---

### `write-module-readme`
**What:** Document module's purpose, structure, entry points, and layers.

**Invoke when:** Creating or updating `README.md` for any module. When module structure, entry points, or purpose changes.

**Produces:** `<module_name>/README.md` (under 50 lines of prose + Mermaid diagram)

**Key gates:**
- Mermaid layer diagram REQUIRED.
- Purpose must be ONE SENTENCE — if more is needed, module boundary is unclear.
- "What Does NOT Belong Here" must name alternative locations explicitly.
- Entry Points table must match current actual state.
- At least one RUNNABLE command in "How to Run".
- Required sections: Purpose, What Belongs Here, What Does NOT Belong Here, Layer Diagram, Entry Points, How to Run, How to Use (Python import example), Internal Structure, Dependencies.

---

### `write-human-doc`
**What:** Create documentation for human readers who know domain but haven't read code.

**Invoke when:** Creating or updating documentation in `docs/human_docs/`. After building or significantly changing a feature/module.

**Produces:** `docs/human_docs/<doc_name>.md`

**Key gates:**
- Write for behavior and intent — NOT implementation details.
- Keep short enough that someone actually reads it.
- Required sections: Title, Last updated date, What this document covers, Overview, Section per topic, Common mistakes/gotchas, How to verify it is working.
- Do not copy internal implementation details.
- Update whenever behavior or workflow changes.

---

### `handoff`
**What:** Create concise handoff document from current conversation so a fresh agent/session can continue without re-reading full chat.

**Invoke when:** User asks to create handoff, wrap up a long chat, prepare context for new session. Phrases: "create handoff", "this chat is getting long", "summarize for next session".

**Produces:** `/tmp/handoff_<topic>_<YYYYMMDD_HHMM>.md` with 7-section format.

**Key gates:**
- Compact but not vague — reader orients in <2 minutes.
- Only confirmed decisions (speculative = omitted or `[uncertain]`).
- No duplicate content from referenced artifacts — point by path/URL only.
- Project Memory Update = stable, decided, reusable facts only.
- Redact API keys, passwords, tokens, PII.
- No chain-of-thought or internal reasoning — only conclusions and facts.

---

### `handoff-coding-agent`
**What:** Bridge between sessions — next agent resumes without re-reading full task history.

**Invoke when:** At every phase checkpoint. When session ending mid-phase. When switching between agent models. Before proceeding past any phase boundary.

**Produces:** `docs/session_state.md` (ALWAYS OVERWRITTEN — reflects current state, not history)

**Key gates:**
- File always overwritten — reflects NOW, not history.
- Required sections: Feature Being Built, Current Status, Completed Tasks (with actual outcomes), Next Task (copied EXACTLY from `tasks.md`), Current Codebase State (table of actual disk state), Decisions Made (with reasons), Blockers / Open Questions, How to Resume.
- Decisions include REASON — not just what was decided.
- Resume verification command must be RUNNABLE and correct.
- Blockers explicitly called out: "Do not proceed past Task X.Y until resolved."
- If no blockers: state "None — proceed to next task."

---

### `find-skills`
**What:** Discover and install agent skills from the open skills ecosystem.

**Invoke when:** User asks "how do I do X" where X might be a common task with an existing skill. "Find a skill for X." "Is there a skill for X?"

**Produces:** Recommended skills with install commands.

**Key gates:**
- Check skills.sh leaderboard FIRST before running CLI search.
- Only recommend based on verified quality: install count ≥1K (be cautious <100), source reputation (trusted orgs), GitHub stars ≥100.
- Do NOT recommend based solely on search results.
- Verify before recommending.

---

## 9. Utility Skills (5)

---

### `caveman`
**What:** Ultra-compressed communication mode — ~75% token reduction while keeping full technical accuracy.

**Invoke when:** User says "caveman mode", "talk like caveman", "use caveman", "less tokens", "be brief". Invokes `/caveman`.

**6 Intensity Levels** (switch with `/caveman lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra`):
- **lite:** no filler/hedging, keep articles + full sentences, professional but tight
- **full (default):** drop articles, fragments OK, short synonyms, classic caveman
- **ultra:** abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y)
- **wenyan-lite:** semi-classical, drop filler/hedging, keep grammar structure
- **wenyan-full:** maximum classical terseness, 80–90% character reduction
- **wenyan-ultra:** extreme abbreviation + classical feel

**Key gates:**
- Drop: articles (a/an/the), filler (just/really/basically/actually), pleasantries (sure/certainly), hedging.
- Fragments OK, short synonyms, technical terms exact.
- Code blocks, commits, PRs: write normal (no caveman).
- Auto-clarity: drop caveman for security warnings, irreversible action confirmations, confusing sequences.
- Level persists until changed or session end. User says "normal" or "stop caveman" to deactivate.

---

### `diagnose`
**What:** Disciplined 6-phase diagnosis loop for hard bugs and performance regressions.

**Invoke when:** User reports a bug, something broken/throwing/failing. Performance regression described.

**6-Phase Process:**
1. **Build feedback loop** (spend disproportionate effort here — correct loop = bug 90% fixed). Try: failing test → curl script → CLI + fixture → headless browser → replayed trace → throwaway harness. If cannot build loop: STOP and say so explicitly.
2. **Reproduce:** run loop, watch bug appear, confirm symptom matches what user described.
3. **Hypothesize:** generate 3–5 ranked, falsifiable hypotheses BEFORE testing any. Show ranked list to user.
4. **Instrument:** each probe maps to a specific prediction. Change one variable at a time. Tag debug logs with unique prefix (e.g., `[DEBUG-a4f2]`).
5. **Fix + regression test:** write regression test BEFORE fix (if correct seam exists). Correct seam = exercises real bug pattern at call site.
6. **Cleanup + post-mortem:** remove all `[DEBUG-...]` instrumentation, delete throwaway prototypes, state hypothesis that was correct in commit/PR message.

---

### `grill-with-docs`
**What:** Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree — and, when a domain model exists, also challenge the plan against it, sharpen terminology, and update documentation inline. Degrades gracefully to a plain interview when no `CONTEXT.md` exists. (Absorbed the former standalone `grill-me` skill 2026-07-12 — its procedure was a near-verbatim subset of this one; archived at `archive/2026-07/skills/utility/grill-me/`, see `docs/specs/005_skill_audit.md` Finding F2.)

**Invoke when:** User wants to stress-test a plan or design, "grill me on this," or wants to validate a plan against the project's documented language and decisions.

**Produces:** Updated `CONTEXT.md` (glossary), ADRs if warranted.

**Key gates:**
- Challenge against glossary in `CONTEXT.md` — call out conflicts immediately.
- Sharpen fuzzy language with precise canonical terms.
- Update `CONTEXT.md` inline as terms are resolved (not batched).
- Offer ADRs ONLY when all three true: hard to reverse, surprising without context, result of real tradeoff.
- Ask questions one at a time.

---

### `teach`
**What:** Teach user a new skill or concept with a multi-session learning structure.

**Invoke when:** User asks to learn something over multiple sessions.

**Produces:** Teaching workspace: `MISSION.md`, `learning-records/*.md`, `reference/*.html`, `RESOURCES.md`, `lessons/*.html`, `NOTES.md`

**Key gates:**
- One self-contained HTML file per lesson (saved to `./lessons/0001-<dash-case-name>.html`).
- Short, completable quickly. Tied to mission. In user's zone of proximal development.
- Knowledge = acquisition via resources (difficulty is enemy); Skills = durability via effortful retrieval (difficulty is tool).
- If mission unclear → question user first before creating any lessons.

---

### `write-a-skill`
**What:** Create new agent skills with proper structure and progressive disclosure.

**Invoke when:** User wants to create, write, or build a new skill.

**Produces:** Skill directory with `SKILL.md` + optional `REFERENCE.md`, `EXAMPLES.md`, `scripts/`

**Key gates:**
- Description is CRITICAL (only thing agent sees when deciding to load): max 1024 chars, third person, first sentence = what it does, second sentence = "Use when [specific triggers]."
- `SKILL.md` under 100 lines — split to separate files if larger.
- Add scripts when: operation is deterministic and same code would be generated repeatedly.
- Pre-submit checklist: description includes triggers, no time-sensitive info, concrete examples included, consistent terminology.

---

## 9b. Optional Skills (0)

`skills/optional/` is a tier for per-project, opt-in skills that don't apply
universally the way core/utility skills do — kept separate so an agent
never loads them by default. It currently has **zero active skills**.

Its last occupants were `skills/optional/mcp-graph/*` (5 skills wrapping a
`code-review-graph` MCP server for graph-powered code navigation). All five
were archived 2026-07-12 after the `code-review-graph` MCP integration was
confirmed dead in this environment — the dependency was retired, not
superseded by anything:
- `debug-issue`, `explore-codebase`, `refactor-safely`, `review-changes` →
  `archive/2026-07/skills/optional/mcp-graph/<name>/`
- `codebase-design` (misplaced inside `mcp-graph/` despite having no
  graph-tool references — it described an unrelated project's folder
  layout) → staged at `~/agent-governance/relocate-to-cad-code/` pending
  manual move into that project's own repo; not archived, not counted in
  the skill totals above.

The `skills/optional/mcp-graph/` directory itself is left in place, empty,
as a valid location for future opt-in skills — see
`docs/specs/005_skill_audit.md` Findings F3–F5.

---

## 10. Forbidden Patterns

An agent must never do any of the following:

- **Giant pipeline functions.** One function = one responsibility. If you write "and" in a function name, split it.
- **Hardcoded values.** Paths, model names, thresholds, credentials → `config/` or `.env`.
- **Duplicated schemas.** One canonical location. Do not redefine what already exists.
- **Dead code in active files.** Deprecated code → `archive/YYYY-MM/<original_path>`.
- **Commented-out code as backup.** Use version control.
- **Silent exceptions.** Every caught error must be logged with actionable context before re-raise.
- **Shared utilities buried in a single feature module.** Move to `utils/`.
- **Outputs written to source directories.** All run outputs → `execution_results/`.
- **Marking task `[x]` before its Verify step passes.**
- **Repeating an approach flagged FAILED in `AGENT_EXECUTION_LOG.md`** without explicit human override.
- **Dispatching a group's understanding notebook to pi.** Pi executes tasks; it does not decide what's worth demonstrating or write the notebook/Python-equivalent pair — that is always the planning agent's job.
- **Marking a pi execution group `[done]` without both understanding-checkpoint files or an explicit `exempt` reason in `GROUP.md`.**

---

## 11. Task Model Hints

Each task in `docs/tasks/` is annotated:

```
Model hint: <alias>       # planning | complex-reasoning | fast-code | local
Rate limit flag: yes | no
Fallback: <alias>
```

**Global model aliases** (project `AGENTS.md` overrides these):

| Alias | Use case |
|---|---|
| `planning` | Spec, plan, decompose-tasks — Claude Code or Codex only |
| `complex-reasoning` | Debugging, architecture decisions, multi-file refactors |
| `fast-code` | Boilerplate, simple functions, schema definitions |
| `local` | Simple edits, renaming, formatting — local Ollama, unlimited |

**Rate limit handling:** wait 60s → retry once → fall back to `fallback` alias → log in Change Report and `AGENT_EXECUTION_LOG.md`. Never substitute a model silently.

---

## 12. Required Change Report

Output this after every task. Write `None` for empty sections — do not omit sections.

```
## Change Report

### Files Modified
- `path/to/file.py` — what changed, which layer, why

### Files Created
- `path/to/new_file.py` — purpose and layer

### Files Archived
- `path/to/old_file.py` → `archive/YYYY-MM/old_file.py` — reason

### Documentation Updated
- Which docs updated and what changed

### Diagrams Updated
- Which Mermaid diagrams updated and what changed

### Validation Run
- Command / notebook / test and result

### Validation NOT Run
- What was not tested and why

### Known Limitations / Follow-up Work
- Gaps, edge cases not handled, tasks for the next session

### Execution Log Updated
- Summary of what was written to AGENT_EXECUTION_LOG.md
```

---

*This document is a living reference. Update it when skills are added/changed, rules are revised, or the workflow evolves.*
