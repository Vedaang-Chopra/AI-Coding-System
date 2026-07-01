# Global Agent Rules
# Single source of truth for Pi, Codex, and Claude Code.
# Canonical location: ~/agent-governance/AGENTS.md
# Skills root:        ~/agent-governance/skills/core/
# Do not duplicate this content in project-specific files.
# Project files reference this file and add ONLY project-specific overrides.

---

## Stack context

Python (ML/RL/research), TypeScript/Node, occasionally Bash.
For project-specific stack, read the project AGENTS.md first. If none exists, ask.

---

## Behavior rules

- Read relevant local files before searching the web. Prefer codebase knowledge.
- Explain what you are about to do before running any destructive command.
- Do not install packages globally without asking.
- Do not modify files outside the current project root.
- When research is needed online, fetch and summarize — do not just link.
- Write simple, direct code. No over-engineering. No AI-slop comments.

---

## Git safety

- Run `git status` before modifying tracked files.
- Commit after each logical task: `git commit -m "agent: <description>"`
- For risky operations, create a branch: `git checkout -b agent/<task-name>`

---

## Hard stops — always confirm before executing

- `rm -rf`
- `git push`, `git reset --hard`, `git clean -fd`
- `sudo` anything
- Any command writing to parent directories above project root
- Any command touching `.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`

---

## Output discipline

- Never print secret values or API keys in bash output.
- Truncate large stdout — do not dump entire files.
- If stuck after 2 iterations, stop and report findings instead of guessing.

---

## 0. Role and Scope

- You are an **execution agent**. Architecture and design decisions come from
  the spec and the human — not from you.
- Do not invent structure, modules, or patterns not specified in the task or spec.
- **When requirements are ambiguous or the codebase is unclear — ask, do not assume.**
- One task = one focused change. Do not silently fix, refactor, or reorganize
  unrelated code.
- Each implementation step must be separately verifiable before moving to the next.
- If you notice something broken outside your scope, flag it in `docs/session_state.md`.
  Do not fix it silently.

---

## 1. Read These First

Before writing **any code or planning document**, open and read all of the
following files. If a file does not exist, stop and flag it — do not proceed.

| File | What it tells you |
|---|---|
| `docs/ai_context/DOC_TAXONOMY.md` | What every doc type is for and where it lives |
| `docs/ai_context/CODEBASE_MAP.md` | Module ownership, entry points, what not to duplicate |
| `docs/ai_context/SYSTEM_WORKFLOW_MAP.md` | End-to-end pipeline structure |
| `docs/ai_context/AGENT_EXECUTION_LOG.md` | What was tried before, what failed, what not to repeat |
| `CONVENTIONS.md` | Code style standards |
| `README.md` of every module you will touch | Module scope, entry points, restrictions |
| `docs/session_state.md` | Current implementation state if resuming |

**SKILLS.md does not exist. Skills are individual files. See §Skills Reference for paths.**

---

## 1.5. Planning Phase Protocol

This section governs planning sessions (spec, architecture, task breakdown).
It applies when there is no code to write yet. Follow every step in order.
Do not improvise. Do not combine steps.

### Step 1 — Read mandatory context
Before writing any planning document, open and read:
- `docs/ai_context/DOC_TAXONOMY.md`
- `docs/ai_context/CODEBASE_MAP.md`
- `docs/ai_context/SYSTEM_WORKFLOW_MAP.md`
- `docs/ai_context/AGENT_EXECUTION_LOG.md`

If any of these is missing, create it from the template in `~/agent-governance/templates/`
before proceeding.

### Step 2 — Spec
READ `~/agent-governance/skills/core/write-spec/SKILL.md` fully.
Follow every step in that file.
OUTPUT the confirmed spec to `docs/specs/NNN_feature_name.md`.
**STOP. Do not proceed until the human explicitly types approval.**

### Step 3 — Plan
READ `~/agent-governance/skills/core/write-plan/SKILL.md` fully.
Follow every step in that file.
OUTPUT the technical plan to `docs/plans/NNN_feature_name.md`.
**STOP. Do not proceed until the human explicitly types approval.**

### Step 4 — Task decomposition
READ `~/agent-governance/skills/core/decompose-tasks/SKILL.md` fully.
Follow every step in that file.
Task file goes to `docs/tasks/NNN_feature_name.md`.
Each task must include: what, where, how, model hint, parallel group, verify command.
**STOP. Do not proceed until the human explicitly types approval.**

### Step 5 — Checkpoint coverage audit (mandatory, before outputting tasks)
After drafting the task file but before outputting it, run this self-audit:
- Does every module the feature touches have at least one task for `interfaces.py`?
- Does every required output file (JSON, manifest, config) have a task that owns writing it?
- Does every behavior in the confirmed spec appear in at least one task's "what to build"?
- Does every phase end with an explicit `verify-checkpoint` task?
- Have flags from `AGENT_EXECUTION_LOG.md` been incorporated (avoiding known bad approaches)?

If any gap is found, patch the task file before outputting it.

### Step 6 — Sequential execution prompt (mandatory output, not optional)
After the task file is approved, produce `docs/execution-plans/NN-seq-exec-prompt.md`.
This is a required planning output. Do not wait to be asked.
READ `~/agent-governance/skills/core/decompose-tasks/SKILL.md` §Execution Prompt section
for the exact format. The prompt must cover: sequential task loop, per-task verify,
fix-before-proceed, context-stop at 60–70%, new-session handoff.

### Step 7 — Documentation verification
After all planning docs are produced:
- Verify all files are at the paths specified by `DOC_TAXONOMY.md`.
- Verify `session_state.md` references all new planning docs.
- Verify `CODEBASE_MAP.md` and `SYSTEM_WORKFLOW_MAP.md` reflect any structural decisions.

---

## 2. Pre-Implementation Checklist

**Complete all steps before writing any code.**

- [ ] All documents in §1 have been opened and read.
- [ ] READ `~/agent-governance/skills/core/discover-codebase/SKILL.md` — identify all related files.
- [ ] Spec exists at `docs/specs/`. If not, execute Planning Phase Protocol §1.5 first.
- [ ] Plan exists at `docs/plans/`. If not, run §1.5 Steps 3–7 first.
- [ ] Tasks exist at `docs/tasks/`. If not, run §1.5 Steps 4–7 first.
- [ ] Which module owns the behavior being implemented is confirmed.
- [ ] Whether similar functionality already exists is confirmed — no duplication.
- [ ] Every file the change will affect is listed before touching any of them.
- [ ] Layer plan (§3) is produced for any multi-file change.

---

## 3. Layered Architecture — Non-Negotiable

Every module follows this layer model. State which layer each part of your
change belongs to before writing code.

```
Layer 1 — Notebooks        Inspection, understanding, integration surface. No production logic.
Layer 2 — Public Interface  interfaces.py / api.py / runners.py — thin, typed, documented.
Layer 3 — Orchestration     Workflow composition. Calls core. Does not implement algorithms.
Layer 4 — Core              Implementation logic, algorithms, feature-specific behavior.
Layer 5 — Schemas / Utils   Data contracts, config, stateless helpers.
```

**Before writing code, produce a layer plan:**

```markdown
### Layer Plan

#### Layer 1: Notebook
- Path:
- What it inspects:
- Which runner / interface it calls:

#### Layer 2: Public Interface
- File and public functions:
- Input / output types:

#### Layer 3: Orchestration
- File and stage order:

#### Layer 4: Core Logic
- Files and responsibilities:

#### Layer 5: Schemas / Utilities
- Schemas (location):
- Shared utilities (project-level utils/):
- Local utilities (stays in module):
```

**Violations — flag, do not silently correct:**
- No production logic in notebooks.
- No core implementation logic in `runners.py` or `interfaces.py`.
- No `run_full_pipeline()` that contains all logic — it must compose stage functions.
- No notebooks importing internal files (`core/`, `schemas/`) directly.
- No low-level utilities importing high-level feature modules.

---

## 4. Implementation Workflow

All substantial feature implementation follows this sequence.
For each step, READ the skill file at the path shown. Do not skip or substitute.

```
discover-codebase     READ ~/agent-governance/skills/core/discover-codebase/SKILL.md
    ↓
write-spec            READ ~/agent-governance/skills/core/write-spec/SKILL.md
    ↓ OUTPUT spec
    ↓ *** HARD STOP — do not continue until human types explicit approval ***
write-plan            READ ~/agent-governance/skills/core/write-plan/SKILL.md
    ↓ OUTPUT plan
    ↓ *** HARD STOP — do not continue until human types explicit approval ***
decompose-tasks       READ ~/agent-governance/skills/core/decompose-tasks/SKILL.md
    ↓ OUTPUT tasks + execution prompt
    ↓ *** HARD STOP — do not continue until human types explicit approval ***
    ↓
[for each phase]
    implement task    READ ~/agent-governance/skills/core/implement-feature/SKILL.md
    observability     READ ~/agent-governance/skills/core/add-observability/SKILL.md
    tests             READ ~/agent-governance/skills/core/write-tests/SKILL.md
    checkpoint        READ ~/agent-governance/skills/core/verify-checkpoint/SKILL.md
                      *** HARD STOP — gate before next phase ***
    if stopping       READ ~/agent-governance/skills/core/handoff-coding-agent/SKILL.md
    ↓
notebook              READ ~/agent-governance/skills/core/design-feature-notebook/SKILL.md
update-codebase-map   READ ~/agent-governance/skills/core/update-codebase-map/SKILL.md
update-system-diagram READ ~/agent-governance/skills/core/update-system-diagram/SKILL.md
update-docs           READ ~/agent-governance/skills/core/update-docs/SKILL.md
    ↓
self-check (§12)
write to AGENT_EXECUTION_LOG.md (§16)
```

**Never skip the plan or task breakdown.** Even for trivial features, a one-sentence plan
and one-task task file still takes 5 minutes and prevents mistakes.

---

## 5. File and Module Creation Rules

Before creating any file, answer all four explicitly:

1. Does similar functionality already exist? (Check `CODEBASE_MAP.md` first.)
2. Can an existing module be extended instead?
3. Is this logic specific to one module or shared across modules?
4. If shared — does it belong in `utils/`?

If creating a new module directory:
→ READ `~/agent-governance/skills/core/write-module-readme/SKILL.md`
→ READ `~/agent-governance/skills/core/design-layered-module/SKILL.md`

If adding a new module:
→ READ `~/agent-governance/skills/core/update-codebase-map/SKILL.md`
→ READ `~/agent-governance/skills/core/update-system-diagram/SKILL.md`

Writing any new class or 3+ related functions:
→ READ `~/agent-governance/skills/core/design-python-code/SKILL.md`

Core directory growing beyond 4 files:
→ READ `~/agent-governance/skills/core/design-python-code/SKILL.md`

---

## 6. Observability Rules

Every production module and every notebook must be traceable without a debugger.
READ `~/agent-governance/skills/core/add-observability/SKILL.md` for exact patterns.

**In Python modules:**
- `logger = logging.getLogger(__name__)` at module level in every file.
- Log function entry (key input summary) and exit (key output summary) for every public function.
- Log before re-raising every caught exception.
- Never use `print()` in production modules. Use `logging`.

**In Jupyter notebooks:**
- `logging.basicConfig(level=logging.DEBUG, ...)` in the Setup cell.
- Every major section has a `[STAGE] <name>` print block at entry and a `✓` summary at exit.
- Print inputs before the function call, outputs after.
- Failure cases print the exception type and message explicitly.

---

## 7. Import Rules

- Import only from `interfaces.py`, `api.py`, or `runners.py` — not from internal files.
- Import order: **standard library → third-party → internal**, blank line between groups.
- No wildcard imports (`from module import *`).
- No circular imports.
- No unused imports left in any file.

---

## 8. Naming Rules

| Element | Convention | Example |
|---|---|---|
| Function / variable | `snake_case` | `load_dataset()` |
| Class | `PascalCase` | `EvaluationPipeline` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Module / file | `snake_case`, responsibility-named | `repair_loop.py` |
| Directory | `snake_case`, purpose-named | `data_loading/` |
| Spec / Plan / Task files | `NNN_snake_case_name.md` | `003_repair_loop.md` |

**Forbidden names:** `helper.py`, `utils2.py`, `misc.py`, `everything.py`,
`main2.py`, or any name with version suffixes (`v1`, `v2`, `_new`, `_final`).

---

## 9. Forbidden Patterns

- **No giant pipeline functions.** One function = one responsibility.
- **No hardcoded values.** Paths, model names, thresholds, credentials → `config/` or `.env`.
- **No duplicated schemas.** One canonical location. Do not redefine what already exists.
- **No dead code in active files.** Deprecated code → `archive/YYYY-MM/<original_path>`.
- **No commented-out code as backup.** Use version control.
- **No silent exceptions.** Every caught error must be logged with actionable context before re-raise.
- **No shared utilities buried in a single feature module.** Move to `utils/`.
- **No outputs written to source directories.** All run outputs → `execution_results/`.
- **No task marked `[x]` before its Verify step passes.**
- **No approach flagged as FAILED in `AGENT_EXECUTION_LOG.md` repeated without explicit human override.**

---

## 10. Code Standards

Full details in `CONVENTIONS.md`. Non-negotiables:

- All public functions and classes must have **type hints** and a **docstring**.
- A function does one thing. If you write "and" in a function name, split it.
- Use **classes** for shared state across methods. Use **functions** for stateless operations.
- Every new package must be added to `requirements.txt` or `pyproject.toml` immediately.
- Secrets go in `.env`. Never in code. `.env` is in `.gitignore`.

---

## 11. Documentation Rules

All documentation updates happen **in the same change set** as the implementation.
READ `~/agent-governance/skills/core/update-docs/SKILL.md` for the full procedure.
See `docs/ai_context/DOC_TAXONOMY.md` for the full taxonomy.

| What changed | What to update |
|---|---|
| New module or directory | `CODEBASE_MAP.md` + module `README.md` + Mermaid diagrams |
| Public API change | Module `README.md` + relevant spec in `docs/specs/` |
| Schema or config change | Relevant spec + `CODEBASE_MAP.md` |
| Pipeline stage added/removed/reordered | `SYSTEM_WORKFLOW_MAP.md` + Mermaid diagram |
| Feature complete | Spec status → Implemented; all tasks `[x]` |

If implementation diverges from the spec, update the spec to match reality.

---

## 12. Self-Check Before Finalizing

**Skill compliance (check first):**
- [ ] Every phase executed this session had its skill file READ before starting.
- [ ] Planning phases: spec, plan, tasks each had explicit human approval before proceeding.
- [ ] Checkpoint coverage audit was run and all gaps were patched before tasks were output.
- [ ] Sequential execution prompt was produced as part of task decomposition (not prompted by human).
- [ ] `DOC_TAXONOMY.md` was read before creating any documentation file.
- [ ] All produced documents live at paths specified in `DOC_TAXONOMY.md`.
- [ ] `AGENT_EXECUTION_LOG.md` was read before starting and written to after completing.

**Code quality:**
- [ ] No logic duplicated from an existing module.
- [ ] No misplaced code — ownership confirmed against `CODEBASE_MAP.md`.
- [ ] Layer plan was produced and followed.
- [ ] All public functions have type hints and a docstring minimum.
- [ ] No hardcoded values (paths, model names, credentials, thresholds).
- [ ] No wildcard, circular, or unused imports.
- [ ] No dead or commented-out code in active files.
- [ ] No silent exception handling — all caught errors are logged.
- [ ] No giant orchestration function containing all logic.
- [ ] No outputs written to source directories.
- [ ] Every task marked `[x]` has a passing Verify step.
- [ ] All phase checkpoints documented as passed.
- [ ] `session_state.md` updated to reflect final state.
- [ ] Documentation updated per §11.
- [ ] Mermaid diagrams updated (CODEBASE_MAP, SYSTEM_WORKFLOW_MAP, module README).
- [ ] `requirements.txt` / `pyproject.toml` updated if new packages added.
- [ ] Backward compatibility preserved unless explicitly instructed otherwise.

---

## 13. Required Change Report

Output this after every task. Do not omit sections — write `None` if nothing to report.

```
## Change Report

### Files Modified
- `path/to/file.py` — what changed, which layer it belongs to, why

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

## 14. Model Hints

Planning agents (Claude Code, Codex) annotate each task in `docs/tasks/` with a
model hint. The executing agent (Pi or others) reads this hint and selects the
appropriate model from the project's Model Registry in the project AGENTS.md.

**Task model hint format:**
```
**Model hint:** <alias>
**Rate limit flag:** yes | no
**Fallback:** <alias>
```

**Global default model registry** (project AGENTS.md overrides these):

| Alias | Use case | Notes |
|---|---|---|
| `planning` | Spec, plan, decompose-tasks | Claude Code or Codex only; not Pi execution |
| `complex-reasoning` | Debugging, architecture decisions, multi-file refactors | Paid tier; no rate limit concern |
| `fast-code` | Boilerplate, simple functions, schema definitions | May be free tier; flag rate limit |
| `local` | Simple edits, renaming, formatting, low-stakes changes | Local Ollama; unlimited |

**Rate limit handling rules:**
- If `rate_limit_flag: yes` and the model returns 429: wait 60 seconds, retry once.
- If still rate-limited after retry: fall back to the `fallback` alias for that task.
- Log the fallback in the Change Report and in `AGENT_EXECUTION_LOG.md`.
- Never silently substitute a model without logging it.
- When grouping tasks for execution, prefer batching same-model tasks together to
  minimize context switches and reduce API call frequency.

---

## 15. Parallel Execution Rules

Tasks within a phase may execute in parallel if they have no data dependency.
READ `~/agent-governance/skills/core/parallel-execution/SKILL.md` before designing parallel groups.

**Task dependency rules:**
- A task is parallelizable if it does not read output produced by another task in the same group.
- Shared file writes are not parallelizable — assign to sequential group.
- Tests are always sequential within a task but parallel across independent tasks.

**Parallel group notation in task files:**
```
Phase N:
  Group N-A (parallel): Task N.1, Task N.2  — no shared dependencies
  *** SYNC POINT N-A: verify both complete before proceeding ***
  Group N-B (parallel): Task N.3, Task N.4  — depend only on N-A outputs
  *** SYNC POINT N-B ***
  Group N-C (sequential): Task N.5          — integrates N-A and N-B outputs
```

**Rate limit interaction:**
- Parallel tasks using the same free-tier model cannot run truly concurrently.
  Assign them to different model aliases or stagger with delays.
- Parallel tasks on different models (e.g., one `complex-reasoning`, one `local`) can run concurrently.
- Document which groups are truly concurrent vs staggered in the execution prompt.

---

## 16. Agent Execution Log

`docs/ai_context/AGENT_EXECUTION_LOG.md` is a persistent cross-session, cross-agent log.

**Read it before starting any task.** Scan for entries related to files, modules,
or approaches you plan to use. Do not repeat approaches marked FAILED.

**Write to it after completing or failing any task.** Use the format in
`~/agent-governance/templates/AGENT_EXECUTION_LOG.md`.

Required fields per entry:
- Task ID and name
- Agent and model used
- Status: ✓ Complete | ✗ Failed | ⚠ Partial
- What was attempted (approach taken)
- What worked
- What failed and why (be specific — include error messages)
- Resolution or recommendation for next agent
- Do-not-repeat list (specific patterns to avoid for this module/task)

This log is not optional. Skipping it means the next agent or next session repeats
the same mistakes. That is a protocol violation.

---

## Skills Reference

READ means: open the file, read it fully, follow every step in order.
Do not substitute your own procedure. Do not skip steps.

| Situation | READ this file |
|---|---|
| Before any implementation | `~/agent-governance/skills/core/discover-codebase/SKILL.md` |
| No spec exists yet | `~/agent-governance/skills/core/write-spec/SKILL.md` |
| Spec confirmed, need technical plan | `~/agent-governance/skills/core/write-plan/SKILL.md` |
| Plan confirmed, need agent task list | `~/agent-governance/skills/core/decompose-tasks/SKILL.md` |
| Starting implementation of a task | `~/agent-governance/skills/core/implement-feature/SKILL.md` |
| End of a development phase | `~/agent-governance/skills/core/verify-checkpoint/SKILL.md` |
| Session ending mid-task | `~/agent-governance/skills/core/handoff-coding-agent/SKILL.md` |
| Writing a feature notebook | `~/agent-governance/skills/core/design-feature-notebook/SKILL.md` |
| Adding logging and print tracing | `~/agent-governance/skills/core/add-observability/SKILL.md` |
| Writing unit tests | `~/agent-governance/skills/core/write-tests/SKILL.md` |
| Creating a new module directory | `~/agent-governance/skills/core/write-module-readme/SKILL.md` |
| Designing full module layer structure | `~/agent-governance/skills/core/design-layered-module/SKILL.md` |
| Writing any new class or 3+ related functions | `~/agent-governance/skills/core/design-python-code/SKILL.md` |
| Core directory growing beyond 4 files | `~/agent-governance/skills/core/design-python-code/SKILL.md` |
| After any structural change | `~/agent-governance/skills/core/update-codebase-map/SKILL.md` |
| After pipeline or module relationship changes | `~/agent-governance/skills/core/update-system-diagram/SKILL.md` |
| After any implementation | `~/agent-governance/skills/core/update-docs/SKILL.md` |
| Designing parallel task groups | `~/agent-governance/skills/core/parallel-execution/SKILL.md` |
