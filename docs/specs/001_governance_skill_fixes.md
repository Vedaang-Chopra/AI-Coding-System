# Spec 001 — Governance Skill Fixes

**Status:** Draft
**Date:** 2026-06-28
**Author:** Claude Code (from governance.md brief, human-confirmed)
**Feature number:** 001

---

## Purpose

Four concrete failure patterns were observed in real project output (Shastra project,
confirmed as a general pattern across AI-coded projects). Small models following the
current skill files produce: notebook wrappers that show nothing, interfaces that
expose no stages, flat functions that load from disk on every call, and log output
that floods with `arg0=` noise or per-iteration entries. This spec defines what must
change in four skill files and the system overview to eliminate these patterns.

Goal: fix the skills so agents following them produce correct output by default.
Nothing else. No structural changes to the governance system.

---

## Affected Files

| # | File | What changes |
|---|---|---|
| 1 | `skills/core/design-layered-module/SKILL.md` | Add two-tier interface model to Layer 2 |
| 2 | `skills/core/design-feature-notebook/SKILL.md` | Add stage function pre-check, workflow templates, forbidden patterns |
| 3 | `skills/core/design-python-code/SKILL.md` | Add 4 named OOP patterns with detection triggers and code examples |
| 4 | `skills/core/add-observability/SKILL.md` | Add arg-naming rule, loop aggregation rule, log content standard |
| 5 | `SYSTEM_OVERVIEW.md` | Update §8 skill summaries for all 4 changed skills |

---

## Out of Scope

- Rewriting existing project code (Shastra or any other project)
- Changes to the 5-layer architecture model
- Changes to AGENTS.md workflow, planning sections, git rules, or hard stops
- Changes to any skill file not listed above
- AGENT_EXECUTION_LOG.md format
- decompose-tasks task schema format (separate proposal)
- Pi execution context doc (separate proposal)
- Model registry (separate proposal)
- Machine-readable format changes (separate proposal)

---

## Problem 1 — Interface Layer Too Coarse

### What is wrong

The current `design-layered-module` skill describes Layer 2 as a single
`module_name/interfaces.py`. Agents following this produce one coarse pipeline
function per workflow at the module level. Notebooks have nowhere to go — no
stage-level functions to call — so they degenerate to one import and one call.

Example of what gets produced today:
```python
from shastra_gaia.interfaces import run_workflow_extraction
result = run_workflow_extraction(input_json=paths.combined_traces_path,
                                 output_dir=paths.workflow_extraction_dir)
```

This provides zero inspection value.

### What must be true after the fix

The skill must describe a **two-tier interface model**:

**Tier 1 — subdirectory-level `interfaces.py` (step-granular, for notebooks):**
- Every subdirectory with meaningful stages gets its own `interfaces.py`
- Functions correspond to individual steps: `load_traces()`, `segment_steps()`,
  `normalize_tools()`, `annotate_step()`, `load_registry()`
- Notebooks import from Tier 1 files within the same module (bounded to 3–4 imports max)
- Notebooks must never import from `core/` directly

**Tier 2 — module-level `interfaces.py` (pipeline-granular, for automation):**
- Composes Tier 1 functions into pipelines
- `run_workflow_extraction()` lives here, calling Tier 1 in sequence
- Other modules and automation scripts import from here only
- Does NOT call `core/` directly — calls Tier 1 subdirectory interfaces

**New violation pattern the skill must name:**
Module-level `interfaces.py` is a thin wrapper over a single internal function.
This is a design error, not a valid interface.

---

## Problem 2 — Notebooks Not Structured as Staged Inspection

### What is wrong

The current `design-feature-notebook` skill requires 10 sections and mentions
"Stage-by-Stage Inspection" but does not enforce that each section calls a
specific stage function. Small models interpret "Stage-by-Stage Inspection" as
displaying the result of the full pipeline, not calling sub-stage functions individually.

The skill also does not state that if no stage-level functions exist in the
interface, the notebook cannot be written — the interface must be fixed first.

### What must be true after the fix

**Addition 1 — Stage function pre-check (gate before notebook creation):**
Before creating a notebook, enumerate the stages of the workflow. Each stage
must have a corresponding callable function in the interface. If any stage
cannot be called independently, that is an interface gap — fix the interface
first, then write the notebook. Do not write a notebook that cannot show stages.

**Addition 2 — Workflow type templates:**

For data/ML systems:
```
Stage 1: load_data()       → show shape, sample records, data types
Stage 2: preprocess()      → show before/after comparison
Stage 3: split()           → show train/val/test counts
Stage 4: train/infer()     → show key metrics or outputs
Stage 5: save/evaluate()   → confirm artifacts exist, show results
```

For agentic/LLM systems:
```
Stage 1: load_traces()     → show count, sample trace structure
Stage 2: segment_steps()   → show one trace segmented, step types
Stage 3: normalize_tools() → show mapping table before/after
Stage 4: annotate()        → show one annotation with LLM output
Stage 5: aggregate()       → show distribution of labels
```

Each stage = one or two cells. Each cell = one function call + display output.

**Addition 3 — Forbidden patterns in the validation checklist:**
- Notebook has fewer than 5 substantive cells (excluding setup and summary) → INCOMPLETE
- Notebook calls only one function from `interfaces.py` and displays output → REJECT, redesign
- Notebook imports from `core/` to make stage inspection work → REJECT, fix the interface

---

## Problem 3 — OOP Patterns Not Enforced

### What is wrong

The current `design-python-code` skill states "use classes for shared state
across methods." This is too abstract. Small models write flat functions by
default and never trigger the class decision, because there is no named pattern
telling them a specific code shape requires a class.

Observed in Shastra output:
- `default_meaningful_label_registry` called 5 times in a loop — loads from
  disk each time instead of holding result as instance state
- `Annotator` cache dict re-initialized or passed around instead of held as
  `self._cache`

### What must be true after the fix

The skill must add four named OOP patterns, each with a detection trigger
(what code shape means this pattern is needed) and a required class structure:

**Pattern 1 — Registry (load-once, query-many):**
Detection trigger: a function loads data from disk (JSON, YAML, DB) and is
called more than once in any execution path.
Required: Replace with a class. `__init__` loads from disk once. Public methods
query in-memory state only.

**Pattern 2 — Cache-bearing object:**
Detection trigger: a module has a cache dict (`{}`) that is populated at
runtime and checked before expensive operations (LLM calls, file reads).
Required: The dict becomes `self._cache`. The class owns load + save + lookup.

**Pattern 3 — Config/Paths dataclass:**
Detection trigger: 3 or more related Path or config values travel together
through function signatures as separate parameters.
Required: Group into a `@dataclass`.

**Pattern 4 — Strategy / Protocol:**
Detection trigger: a function has `if/elif` chains or `isinstance()` checks
dispatching to different implementations of the same operation.
Required: Define a `Protocol`. Each implementation is a class. The dispatcher
is removed.

**New validation checklist items:**
- No function loads from disk more than once in a single execution path without
  a Registry class holding the result
- No module-level cache dict — caches are instance state on a class
- No 3+ related paths passed separately — grouped into a dataclass
- No `isinstance()` dispatch chain — replaced with Protocol

---

## Problem 4 — Observability: Two Concrete Bugs

### Bug A — Positional arg logging (`arg0`, `arg1`)

The current skill shows log patterns but does not explicitly forbid positional
argument names in log lines. Agents (or log decorators) produce:
```
shastra_gaia.data.io | INFO | load_jsonl | start | arg0=/path/to/file.json
shastra_gaia.extraction.runners | INFO | run_pipeline | start | arg0=..., arg1=...
```

`arg0=` conveys nothing about what the value represents.

### What must be true after the fix (Bug A)

The skill must add an explicit forbidden pattern:
```python
# FORBIDDEN — positional logging
logger.info(f"start | arg0={args[0]}, arg1={args[1]}")

# REQUIRED — named parameter logging
logger.info(f"load_jsonl: start | path={path}")
```

If using a decorator for logging, the decorator must bind args to named
parameters using `inspect.signature()` before logging.

### Bug B — Leaf utility functions logged in tight loops

The current skill warns against `start/done` on helpers, but does not define
log level rules by call context. Agents apply INFO-level logging to leaf
utilities called inside loops, producing:
```
shastra_gaia.extraction.tool_normalization | INFO | normalize_tool_name | start | arg0=web_browser_go
shastra_gaia.extraction.tool_normalization | INFO | normalize_tool_name | done  | result=browser
[repeated hundreds of times for every tool in every step of every trace]
```

This floods the log and makes actual pipeline events invisible.

### What must be true after the fix (Bug B)

**New log level assignment rule:**
- Stage-entry/exit (pipeline boundaries) → `INFO`
- Per-item processing inside a loop → `DEBUG` only, never `INFO`
- Leaf utility functions called from inside loops → no decorator, no logging
  unless explicitly debugging that utility
- Batch summary after a loop completes → `INFO` (e.g., "normalized 47 tool names")

**New loop aggregation pattern:**
```python
# FORBIDDEN — logs every iteration at INFO
for step in steps:
    tool = normalize_tool_name(step.tool)  # logs start/done each iteration

# REQUIRED — log aggregate only
tools = [normalize_tool_name(s.tool) for s in steps]
logger.info(
    "segment_trace: normalized %d tools | unique=%d",
    len(tools), len(set(tools))
)
```

**New log content standard (what every INFO line at a stage boundary must contain):**
- Function name (or stage name)
- At least one named input value (not arg0 — the actual parameter name)
- At least one named output value or count

Example of compliant log line:
```
shastra_gaia.extraction.step_segmenter | INFO | segment_trace_into_steps |
  start | task_id=023e9d44 source=generation_steps gen_steps=8
shastra_gaia.extraction.step_segmenter | INFO | segment_trace_into_steps |
  done  | segments=5 skipped=1 duration_ms=12
```

---

## Acceptance Criteria

1. `design-layered-module/SKILL.md` explicitly describes the two-tier interface model
   with a concrete subdirectory example and names the violation pattern
   ("module-level thin wrapper over single internal function is a design error").

2. `design-feature-notebook/SKILL.md` validation checklist includes:
   - "Every stage has a corresponding callable function in the interface — if not,
     fix the interface before writing the notebook"
   - "Notebook has at least 5 substantive cells excluding setup and summary"
   - "No notebook calls only one function and displays output"
   - "No notebook imports from `core/` to enable stage inspection"
   And includes at least one workflow template (data/ML or agentic/LLM).

3. `design-python-code/SKILL.md` includes all four named patterns (Registry,
   Cache-bearing, Config dataclass, Strategy/Protocol), each with its detection
   trigger and a code example, plus the four new validation checklist items.

4. `add-observability/SKILL.md` forbidden patterns include:
   - `arg0`/`arg1` in log lines (with required alternative)
   - INFO logging inside loops (with loop aggregation alternative)
   - Log lines without named parameters or output count

5. `SYSTEM_OVERVIEW.md` §8 entries for all four changed skills reflect the new
   rules added in criteria 1–4 above.

---

## Validation Plan

After all changes:

1. Read each changed SKILL.md and verify each acceptance criterion is present verbatim
   or in substance — not implied.

2. For `design-layered-module`: grep for "two-tier" or "Tier 1" and "Tier 2" — must appear.

3. For `design-feature-notebook`: grep for "fix the interface before writing the notebook"
   and confirm the "fewer than 5 substantive cells" forbidden pattern is in the checklist.

4. For `design-python-code`: grep for each pattern name ("Registry", "Cache-bearing",
   "Config/Paths dataclass", "Strategy") — all four must appear.

5. For `add-observability`: grep for "arg0" in FORBIDDEN context and "loop" or "aggregate"
   in the log-level rules — both must appear.

6. For `SYSTEM_OVERVIEW.md`: read §8 entries for the four changed skills and confirm
   they describe the new rules (not only the pre-fix descriptions).

---

## Known Risks / Open Questions

1. **Skill file length:** Adding four OOP patterns with examples to `design-python-code`
   may push it well over 100 lines (already substantial). The `write-a-skill` skill
   recommends keeping SKILL.md under 100 lines and splitting to REFERENCE.md.
   Decision needed: add patterns inline to SKILL.md, or create
   `design-python-code/REFERENCE.md` for the pattern library and keep SKILL.md thin?
   → **Recommended:** add to SKILL.md for now; split to REFERENCE.md only if the file
   becomes unnavigable. The patterns are critical decision logic, not reference material.

2. **Notebook skill name:** The brief references `write-notebook.md`. The actual
   canonical file is `skills/core/design-feature-notebook/SKILL.md`. The `write-a-skill`
   related-skills list in `design-layered-module` references `SKILL: write-notebook` —
   this reference is stale and should be updated to `SKILL: design-feature-notebook`.
   This is a minor fix that can be done in the same change set.

3. **Decorator guidance scope:** Bug A mentions that decorators must use
   `inspect.signature()`. The current `add-observability` skill does not mention
   decorators at all. The fix adds the rule; it does not prescribe a specific
   decorator implementation. If a project uses a log decorator, it must follow
   the rule — how the decorator is implemented is out of scope here.

---

*Status: Draft — HARD STOP. Do not edit any skill file until this spec is approved.*
