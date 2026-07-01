# Governance System Fix Brief
**Date:** 2026-06-28
**For:** Claude Code (implementation agent)
**Written by:** Human + Claude (planning session)
**Status:** Ready for spec → plan → implementation

---

## Purpose

This document describes four concrete problems observed in real project output
(Shastra project, confirmed as a general pattern across all AI-coded projects).
Claude Code must read this document, then inspect the actual skill files, then
produce a spec before touching anything.

The goal is to fix four skill files. Nothing else. Do not expand scope.

---

## What Claude Code Must Do First

Before writing a single line:

1. Read `~/agent-governance/AGENTS.md` fully
2. Read `~/agent-governance/SYSTEM_OVERVIEW.md` fully
3. Read each skill file listed in §Evidence below
4. Inspect one real project to confirm the problems described here are actually
   present — suggested: `Shastra/code_base/analysis/gaia/`
5. Write a spec at `docs/specs/001_governance_skill_fixes.md`
6. HARD STOP — do not proceed without human approval

---

## Problem 1 — Interface Layer Too Coarse: Notebooks Become Lazy Wrappers

### What is observed

Jupyter notebooks in every project look like this:

```python
from shastra_gaia.interfaces import run_workflow_extraction
result = run_workflow_extraction(input_json=paths.combined_traces_path,
                                 output_dir=paths.workflow_extraction_dir)
```

One import. One call. Notebook done. This provides zero inspection value.

### Root cause

The module-level `interfaces.py` exposes one coarse pipeline function per workflow.
The function signature hides all intermediate stages. The notebook has nowhere to
go because there are no stage-level functions to call.

Example from actual code — `interfaces.py`:

```python
def sample_audit_traces(output_dir, combined_json_path=None, ...) -> dict:
    """Sample 20 diverse traces for manual audit."""
    if combined_json_path is None:
        combined_json_path = _get_gaia_paths().combined_traces_path
    return _sample_traces(combined_json_path, output_dir, ...)
```

This is a thin wrapper over `_sample_traces`. The notebook calls this. There is
no way to see what `_sample_traces` does step by step.

### What is needed

**Two-tier interface model:**

Tier 1 — subdirectory-level `interfaces.py` (step-granular, for notebooks):
- Every subdirectory that has meaningful stages gets its own `interfaces.py`
- Functions exposed here correspond to individual steps, not the full pipeline
- Examples: `extraction/interfaces.py` → `load_traces()`, `segment_steps()`,
  `normalize_tools()`; `llm/interfaces.py` → `annotate_step()`, `load_registry()`
- Notebooks import from Tier 1 files within the same module

Tier 2 — module-level `interfaces.py` (pipeline-granular, for automation):
- Composes Tier 1 functions into pipelines
- `run_workflow_extraction()` lives here, calling Tier 1 functions in sequence
- Other modules and automation import from here only
- Does NOT call `core/` directly — it calls Tier 1 subdirectory interfaces

**Notebook import rule:**
- Notebooks may import from Tier 1 subdirectory `interfaces.py` files within
  the same module — bounded to 3–4 files maximum
- Notebooks must never import from `core/` directly

### Skill to fix

`~/agent-governance/skills/core/design-layered-module.md`

Current Layer 2 description says only "module_name/interfaces.py". This must be
expanded to describe the two-tier model explicitly with the subdirectory pattern.

Also add a VIOLATION pattern: "Module-level `interfaces.py` is a thin wrapper
over a single internal function → this is a design error, not a valid interface."

---

## Problem 2 — Notebooks Are Not Structured as Staged Inspection

### What is observed

Even when notebooks call multiple functions, they do not show intermediate state.
They are structured as: setup → run full pipeline → inspect output. The stages
in between are invisible.

The intent was: each notebook corresponds to one feature/workflow, with cells
that mirror the pipeline stages so a human can see data transform step by step.

Example of what a well-structured notebook should look like (ML training case):
```
Cell 1 — Purpose and setup
Cell 2 — Load raw data, show shape, sample records
Cell 3 — Preprocess, show before/after diff
Cell 4 — Train/val split, show counts
Cell 5 — Run model, show training curve
Cell 6 — Save model, confirm file exists
Cell 7 — Assertions (file exists, metrics above threshold)
Cell 8 — Edge case: empty input
Cell 9 — Summary
```

Each cell calls one stage function from the Tier 1 interface. The notebook is
a narrative of how the system works.

### Root cause

`write-notebook.md` (or `design-feature-notebook.md`) states that notebooks
should have 10 sections and show stage-by-stage inspection — but does not
enforce that each section calls a specific function. A small model reads
"Stage-by-Stage Inspection" and interprets it as displaying the result of the
pipeline, not calling sub-stage functions individually.

The skill also does not state: "if no stage-level functions exist in the
interface, you must add them before writing the notebook."

### What is needed

`write-notebook.md` needs two additions:

**Addition 1 — Stage function requirement:**
Before creating a notebook, enumerate the stages of the workflow. Each stage
must have a corresponding callable function in the interface. If a stage cannot
be called independently, that is a gap in the interface — fix the interface
first, then write the notebook. Do not write a notebook that cannot show stages.

**Addition 2 — Notebook design template per workflow type:**

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

Each stage = one or two notebook cells. Each cell = one function call + display.

**Addition 3 — Forbidden pattern (add to validation checklist):**
- Notebook has fewer than 5 substantive cells (excluding setup and summary)
  → INCOMPLETE
- Notebook calls only one function from `interfaces.py` and displays output
  → REJECT, redesign

### Skill to fix

`~/agent-governance/skills/core/write-notebook.md` (or
`design-feature-notebook.md` — Claude Code must check which one is canonical)

---

## Problem 3 — OOP Patterns Not Enforced: Backend Is Flat Functions

### What is observed

From the Shastra log:

```
shastra_gaia.llm.label_registry | INFO | default_meaningful_label_registry | start | no_args
shastra_gaia.llm.label_registry | INFO | default_meaningful_label_registry | done | result=dict(...)
shastra_gaia.llm.label_registry | INFO | default_meaningful_label_registry | start | no_args
shastra_gaia.llm.label_registry | INFO | default_meaningful_label_registry | done | result=dict(...)
[repeated 5 times]
```

`default_meaningful_label_registry` is being called 5 times inside an
initialization loop. It loads from disk each time. It should load once and be
held as instance state. There is no class — it is a module-level function.

Similarly: `Annotator` has a cache dict. The cache is not held as instance state
on a class — it is re-initialized or passed around. This is why `load_cache`
appears in the log as a separate function call each time.

### Root cause

`design-python-code.md` says "use classes for shared state across methods."
This is too abstract for a small model. It does not give named patterns that
map to concrete detection triggers, so the model writes flat functions by default.

### What is needed

Four named OOP patterns added to `design-python-code.md`, each with:
- Pattern name
- Detection trigger (what code shape indicates this pattern is needed)
- Required class structure

**Pattern 1 — Registry (load-once, query-many):**
Detection trigger: A function loads data from disk (JSON, YAML, DB) and is
called more than once in any execution path.
Required: Replace with a class. `__init__` loads from disk. Public methods
query in-memory state only. `load_or_create_label_registry()` is the concrete
example of this violation.

```python
class LabelRegistry:
    def __init__(self, path: Path):
        self._data = self._load(path)
    def get_categories(self) -> list[str]:
        return self._data["categories"]
```

**Pattern 2 — Cache-bearing object:**
Detection trigger: A module has a cache dict (`{}`) that is populated during
runtime and checked before doing work (LLM calls, file reads, expensive ops).
Required: The dict becomes `self._cache`. The class owns load + save + lookup.
`Annotator` with `load_cache` / `save_cache` is the concrete example.

```python
class Annotator:
    def __init__(self, cache_path: Path):
        self._cache: dict[str, Any] = self._load_cache(cache_path)
    def annotate(self, key: str) -> Annotation:
        if key in self._cache:
            return self._cache[key]
        ...
```

**Pattern 3 — Config/Paths dataclass:**
Detection trigger: 3 or more related Path or config values travel together
through function signatures.
Required: Group into a `@dataclass`. `GaiaPaths` is the correct pattern —
enforce it everywhere paths appear as separate arguments.

```python
@dataclass
class GaiaPaths:
    root: Path
    data_dir: Path
    analysis_dir: Path
    combined_traces_path: Path
```

**Pattern 4 — Strategy / Protocol:**
Detection trigger: A function has `if/elif` chains or `isinstance()` checks
dispatching to different implementations of the same operation.
Required: Define a `Protocol`. Each implementation is a class that satisfies
the Protocol. The dispatcher is removed.

```python
class ToolNormalizer(Protocol):
    def normalize(self, tool_name: str) -> str: ...
```

Add to `design-python-code.md` validation checklist:
- [ ] No function loads from disk more than once in a single execution path
      without a Registry class holding the result
- [ ] No module-level cache dict — caches are instance state on a class
- [ ] No 3+ related paths passed separately — grouped into a dataclass
- [ ] No `isinstance()` dispatch chain — replaced with Protocol

### Skill to fix

`~/agent-governance/skills/core/design-python-code.md`

---

## Problem 4 — Observability: Two Distinct Bugs

### Bug A — arg0/arg1 parameter naming

From the log:

```
shastra_gaia.data.io | INFO | load_jsonl | start | arg0=/path/to/file.json
shastra_gaia.extraction.runners | INFO | run_pipeline | start | arg0=..., arg1=..., use_llm=False
```

`arg0` and `arg1` are generated names, not the actual parameter names. A logging
decorator is capturing positional arguments without binding them to the function's
named parameters. When debugging, `arg0=` tells you nothing about what the value
represents.

**Fix required in `add-observability.md`:**
The log entry format must use actual parameter names, not positional indices.
If using a decorator, it must inspect the function signature with `inspect.signature`
and bind args to names. Explicit log lines should always use named variables:
`logger.info(f"load_jsonl: start | path={path}")`

Forbidden pattern to add:
```python
# FORBIDDEN — positional logging
logger.info(f"start | arg0={args[0]}, arg1={args[1]}")

# REQUIRED — named parameter logging
logger.info(f"load_jsonl: start | path={path}")
```

### Bug B — Leaf utility functions logged in tight loops

From the log (abbreviated — this block repeats hundreds of times):

```
shastra_gaia.extraction.tool_normalization | INFO | normalize_tool_name | start | arg0=web_browser_go
shastra_gaia.extraction.tool_normalization | INFO | normalize_tool_name | done  | result=browser
shastra_gaia.extraction.tool_normalization | INFO | normalize_tool_name | start | arg0=web_browser_go
shastra_gaia.extraction.tool_normalization | INFO | normalize_tool_name | done  | result=browser
[repeated for every tool in every step of every trace]
```

`normalize_tool_name` is a leaf utility called inside a loop over steps and traces.
Logging it at INFO level floods the log and makes the actual pipeline events
invisible. The entire log becomes noise.

**Fix required in `add-observability.md`:**

New rule — Logging Level Assignment:
- Stage-entry/exit (pipeline boundaries) → `INFO`
- Per-item processing inside a loop → `DEBUG` only, never `INFO`
- Leaf utility functions (called from inside loops) → no decorator, no logging
  unless explicitly debugging that utility
- Batch summary after a loop completes → `INFO` (e.g., "normalized 47 tool names")

New rule — Loop Aggregation Pattern:
Do not log inside loops at INFO. Log the aggregate after the loop:

```python
# FORBIDDEN — logs every iteration
for step in steps:
    tool = normalize_tool_name(step.tool)  # logs start/done each time

# REQUIRED — log aggregate only
tools = [normalize_tool_name(s.tool) for s in steps]
logger.info(f"segment_trace: normalized {len(tools)} tools | "
            f"unique={len(set(tools))}")
```

New rule — What a good log line must contain:
Every INFO log line at a stage boundary must include at minimum:
- function name
- one key input value (not arg0 — the named parameter)
- one key output value or count

Example:
```
shastra_gaia.extraction.step_segmenter | INFO | segment_trace_into_steps |
  start | task_id=023e9d44 source=generation_steps gen_steps=8
shastra_gaia.extraction.step_segmenter | INFO | segment_trace_into_steps |
  done  | segments=5 skipped=1 duration_ms=12
```

### Skill to fix

`~/agent-governance/skills/core/add-observability.md`

---

## Files Claude Code Must Change

| # | File | Change type |
|---|---|---|
| 1 | `~/agent-governance/skills/core/design-layered-module.md` | Add two-tier interface model to Layer 2 section |
| 2 | `~/agent-governance/skills/core/write-notebook.md` | Add stage function requirement + staged templates + forbidden patterns |
| 3 | `~/agent-governance/skills/core/design-python-code.md` | Add 4 named OOP patterns with detection triggers |
| 4 | `~/agent-governance/skills/core/add-observability.md` | Add arg-naming rule + loop aggregation rule + log content standard |
| 5 | `~/agent-governance/SYSTEM_OVERVIEW.md` | Update §8 entries for the 4 changed skills to reflect new rules |

**Note:** Claude Code must first inspect actual project files to confirm these
patterns exist before editing skills. Suggested inspection path:
`Shastra/code_base/analysis/gaia/`

---

## What Claude Code Must NOT Change

- The 5-layer architecture model — it is correct
- AGENTS.md workflow and planning sections
- Any other skill file not listed above
- Git rules, hard stops, or output discipline rules
- AGENT_EXECUTION_LOG.md format
- The decompose-tasks task schema format (being fixed separately)

---

## Scope of First Fix Pass

**In scope:** The 4 skill files listed above only.

**Out of scope for this task:**
- Rewriting any existing project's code (that is a separate task after skills are fixed)
- Machine-readable task format changes (separate proposal exists)
- Pi execution context doc (separate proposal exists)
- Model registry (separate proposal exists)

---

## Validation Criteria

After all changes, the following must be true:

1. `design-layered-module.md` explicitly describes two-tier interface structure
   with per-subdirectory `interfaces.py` and a worked example

2. `write-notebook.md` validation checklist includes:
   - "Every stage has a corresponding callable function in the interface"
   - "Notebook has at least 5 substantive cells excluding setup and summary"
   - "No notebook calls only one function and displays output"

3. `design-python-code.md` includes all 4 named patterns (Registry,
   Cache-bearing, Config dataclass, Strategy/Protocol) with detection triggers
   and code examples

4. `add-observability.md` forbidden patterns include:
   - `arg0`/`arg1` in log lines
   - INFO logging inside loops
   - Log lines with no named parameters or output count

5. `SYSTEM_OVERVIEW.md` §8 entries for all 4 skills reflect the new rules

---
