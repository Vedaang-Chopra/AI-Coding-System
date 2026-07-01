# Global Agent Rules
# Single source of truth for Pi, Codex, and Claude Code.
# Canonical location: ~/agent-governance/AGENTS.md
# Skills root:        ~/agent-governance/skills/core/
# Do not duplicate this content in project-specific files.
# Project files reference this file and add ONLY project-specific overrides.

---

## How to Use This File

Universal rules for ALL agents. Read this first, always.
- **Planning agents (Claude Code, Codex):** Read this + `~/agent-governance/AGENTS.planning.md`
- **Execution agents (Pi + GPT-5.4-mini):** Read this + `~/agent-governance/AGENTS.execution.md`
Do not read both extension files. Each agent reads only its own.

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

**Skills are individual .md files in . See AGENTS.planning.md or AGENTS.execution.md for the relevant skill reference table.**

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

**Lazy wrappers — function form:**
```python
# FORBIDDEN
def get_paths():                    # Body is one call with no transformation
    return _get_paths()

# CORRECT
from .module import _get_paths as get_paths   # Direct re-export
```
A public function whose entire body is a single delegating call must not exist. Re-export directly with `from .module import func as public_name`. Only create a wrapper function when the task explicitly specifies one with a stated reason (e.g., input validation, type coercion, composition of 2+ calls).

**Lazy wrappers — assignment form:**
```python
# FORBIDDEN — no docstring, no justification, two names for one function
run_code_graph_extraction = run_extraction_pipeline

# CORRECT — if two names are genuinely needed, document why
# run_code_graph_extraction is the public name; run_extraction_pipeline kept for backward compat
run_code_graph_extraction = run_extraction_pipeline
```
Module-level assignment aliases must have a comment explaining why two names exist. If no justification can be stated, remove one name.

**Silent exception swallows — any form:**
```python
# FORBIDDEN — all of these
except Exception: pass
except Exception: return None
except Exception as e: return {}
except Exception as e: return default
```
Every caught exception must be logged with context before the function returns or re-raises. No exceptions.

**Broad catch with post-hoc filtering:**
```python
# FORBIDDEN
except Exception as exc:
    if not _is_sdk_error(exc):
        raise
    raise WrappedError(exc) from exc

# CORRECT — catch the specific type directly
except SdkBaseError as exc:
    raise WrappedError(exc) from exc
```

**No giant pipeline functions.** One function = one responsibility. If you write "and" in a function name, split it.

**No hardcoded values.** Paths, model names, thresholds, credentials → `config/` or `.env`.

**No duplicated schemas.** One canonical location. Do not redefine what already exists.

**No dead code in active files.** Deprecated code → `archive/YYYY-MM/<original_path>`.

**No commented-out code as backup.** Use version control.

**No silent exceptions.** Every caught error must be logged with actionable context before re-raise.

**No shared utilities buried in a single feature module.** Move to `utils/`.

**No outputs written to source directories.** All run outputs → `execution_results/`.

**No task marked `[x]` before its Verify step passes.**

**No approach flagged as FAILED in `AGENT_EXECUTION_LOG.md` repeated without explicit human override.**


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
