---
name: add-observability
description: >
  Use when adding logging, tracing, or diagnostic output to any module or
  notebook. Defines a two-layer observability model: structured logging for
  machines and human-readable stage summaries for people. Apply at meaningful
  pipeline boundaries — not at every function call. Triggers: "add logging",
  "add observability", "make this debuggable", "add tracing", any new pipeline
  stage, or any new notebook section being written.
---

# SKILL: add-observability

## What Observability Is For

Observability should help a human understand:

- What data entered a stage and its shape/counts
- How data was transformed — what changed, what was filtered
- What control-flow decision was made and why
- What counts, labels, schemas, or artifacts were produced
- Where anomalies occurred and what context surrounds them
- How raw input became final output

Observability is **not** a function call tracer. It is a semantic record of
what the pipeline did and why.

---

## Reversal Rule (Read This First)

If a previous agent added mechanical `start/done` logs on every function,
**remove or demote them before adding meaningful observability.**

Signs of mechanical logging to remove:
```python
# Remove patterns like these:
logger.info("normalize_label | start | arg0=%s", label)
logger.info("normalize_label | done | result=%s", result)
logger.debug("_read_file | start")
logger.debug("_read_file | done")
```

Replace sparse `start/done` pairs at pipeline boundaries with a single
semantic summary after the stage completes.

---

## Two-Layer Model

### Layer 1 — Structured Logging (for machines, CI, and post-hoc debugging)

- Uses the standard `logging` module
- Controlled by log level (`INFO` default, `DEBUG` opt-in)
- Lives in Python modules only — never `print()` in production code
- Should be quiet enough at `INFO` that a human can read it without scrolling past noise
- Third-party loggers must be suppressed explicitly

### Layer 2 — Human-Readable Stage Output (for notebooks, CLI, demos, audits)

- Uses `print()` in notebooks or a dedicated `explain()` helper in CLI tools
- Enabled explicitly via `explain=True`, `verbose=True`, or `--explain` flag
- Stage-level granularity — one summary block per pipeline stage
- Focuses on semantic state: counts, decisions, anomalies, artifacts produced
- Off by default in production runs

---

## Where to Add Observability

### Good boundaries — add observability here

- Pipeline entry points (inputs received, config loaded)
- Data loading boundaries (rows loaded, schema validated)
- Parsing and normalization stages (count before/after, anomalies found)
- Validation stages (pass/fail counts, which IDs failed)
- Branching and routing decisions (which branch taken, why)
- Matching and retrieval decisions (candidates found, top result, score)
- Labeling and classification decisions (label assigned, confidence, fallback used)
- Scoring and ranking stages (score distribution, top-k)
- Graph/build/compile stages (nodes, edges, size)
- Export and write stages (files written, row counts)
- Error and anomaly boundaries (what failed, with which input ID)

### Bad places — do not add observability here

- Tiny pure helper functions (string normalization, type coercion)
- Every getter and setter
- Every serialization helper
- Every loop iteration (log count before and after, not per-item)
- Third-party library internals
- Repeated `start`/`done` around every function call

---

## Context A: Python Modules

### Module-Level Logger Setup

Every file that contains public or pipeline functions gets one logger at the top:

```python
import logging

logger = logging.getLogger(__name__)
```

This produces names like `pipeline.core.loader` — traceable by module path.

### Suppressing Third-Party Noise

In the module that initializes logging (or in the root config), suppress noisy
third-party loggers explicitly:

```python
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("boto3").setLevel(logging.WARNING)
logging.getLogger("botocore").setLevel(logging.WARNING)
```

Only remove these suppressions when actively debugging that specific library.

### Log Level Guide

| Level | When to use |
|---|---|
| `INFO` | Stage boundaries, key decisions, counts before/after transformations, artifacts written |
| `DEBUG` | Detailed diagnostics, sampled internals, verbose traces — off by default |
| `WARNING` | Suspicious but recoverable: unexpected schema, missing optional field, fallback used |
| `ERROR` | Failed operation — include the input identifier (task_id, file path, record key) |
| `CRITICAL` | Unrecoverable system failure |

At `INFO` level, a human should be able to read the log and understand what the pipeline did.
At `DEBUG` level, a developer should be able to trace individual decisions.

### Logging at Pipeline Boundaries — Semantic Summaries

Log a semantic summary at stage entry and exit, not a mechanical `start/done` pair.

**Stage entry** — log what you received:
```python
logger.info(
    "load_inputs | path=%s | expected_format=%s",
    config.input_path, config.format
)
```

**Stage exit** — log what you produced and any anomalies:
```python
logger.info(
    "load_inputs | loaded=%d rows | missing_generation_steps=%d | skipped=%d",
    len(records), missing_count, skipped_count
)
if missing_count > 0:
    logger.warning(
        "load_inputs | %d records missing generation_steps | first=%s",
        missing_count, missing_ids[0]
    )
```

**Error** — always include the input identifier:
```python
except FileNotFoundError:
    logger.error("load_inputs | file not found | path=%s", config.input_path)
    raise
except Exception as e:
    logger.error(
        "load_inputs | unexpected error | type=%s | path=%s",
        type(e).__name__, config.input_path
    )
    raise
```

### What NOT to Log in Python Modules

```python
# WRONG — mechanical start/done on helpers
def normalize_label(label: str) -> str:
    logger.info("normalize_label | start | arg0=%s", label)  # NO
    result = label.strip().lower()
    logger.info("normalize_label | done | result=%s", result)  # NO
    return result

# WRONG — start/done on every public function regardless of meaning
def get_config_path() -> Path:
    logger.info("get_config_path | start")  # NO
    path = self._config_path
    logger.info("get_config_path | done | result=%s", path)  # NO
    return path
```

```python
# RIGHT — one semantic log at the stage boundary that calls many helpers
def run_normalization_stage(records: list[Record]) -> list[Record]:
    normalized = [normalize_record(r) for r in records]
    failed = [r for r in normalized if r.label is None]
    logger.info(
        "normalization | input=%d | normalized=%d | label_failures=%d",
        len(records), len(normalized), len(failed)
    )
    if failed:
        logger.warning(
            "normalization | %d records without labels | sample_ids=%s",
            len(failed), [r.id for r in failed[:3]]
        )
    return normalized
```

---

## Context B: Jupyter Notebooks

### Setup Cell — Logging Configuration

```python
import logging

# Configure root logger at INFO — human-readable by default
logging.basicConfig(
    level=logging.INFO,
    format="%(name)s | %(levelname)s | %(message)s"
)

# Suppress third-party noise explicitly
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

# Set DEBUG only for the modules you are actively debugging:
# logging.getLogger("pipeline.core.loader").setLevel(logging.DEBUG)
```

Do NOT set `logging.basicConfig(level=logging.DEBUG)` globally — this floods
the notebook with third-party library internals.

### Stage Print Block Pattern

Stage print blocks provide human-readable summaries of what happened at each
pipeline stage. They are the Layer 2 output — semantic, not mechanical.

```python
# ── STAGE: load_inputs ──────────────────────────────────────────────
print("\n" + "─" * 60)
print("[Input Loaded]")
print(f"  path              : {config.input_path}")

records = load_inputs(config)

missing = [r for r in records if not r.generation_steps]
print(f"  rows              : {len(records)}")
print(f"  unique_tasks      : {len({r.task_id for r in records})}")
print(f"  fields_present    : generation_steps, messages, metadata")
print(f"  missing_gen_steps : {len(missing)}")
if missing:
    print(f"  missing_ids       : {[r.task_id for r in missing[:3]]}{'...' if len(missing) > 3 else ''}")
print("─" * 60 + "\n")
```

```python
# ── STAGE: segment_steps ────────────────────────────────────────────
print("\n" + "─" * 60)
print("[Step Segmentation]")
print(f"  input_tasks       : {len(records)}")

segments = segment_all(records, config)

total_steps = sum(len(s.steps) for s in segments)
tool_steps  = sum(s.tool_count for s in segments)
skipped     = sum(s.skipped_count for s in segments)
print(f"  total_steps       : {total_steps}")
print(f"  tool_steps        : {tool_steps}")
print(f"  skipped_steps     : {skipped}")
print(f"  sample_task       : {segments[0].task_id if segments else 'none'}")
print("─" * 60 + "\n")
```

```python
# ── STAGE: write_outputs ────────────────────────────────────────────
print("\n" + "─" * 60)
print("[Artifacts Written]")

paths = write_outputs(segments, config)

for label, path in paths.items():
    rows = count_rows(path)
    print(f"  {label:<25} : {path.name} ({rows} rows)")
print("─" * 60 + "\n")
```

### Stage Print Rules

1. Every stage block starts with a named header: `[Stage Name]`.
2. Print key **inputs** before calling the function — so you see what was passed if it crashes.
3. Print key **outputs** after the call — counts, schema summary, artifact paths.
4. Show counts, not full lists. For lists, show top-3 with `...` if longer.
5. Make control-flow decisions visible: which branch, which label, which fallback.
6. For errors:
   ```python
   print(f"  ✗ error type  : {type(e).__name__}")
   print(f"  ✗ message     : {e}")
   print(f"  ✗ input_id    : {record.task_id if record else 'unknown'}")
   ```
7. Do NOT add stage blocks for trivial operations: imports, config reads, variable assignments.
8. Do NOT add a stage block for every helper call inside a stage — one block per stage.

### Opt-In Verbose Mode

For detailed per-item traces, use an explicit flag:

```python
EXPLAIN = True  # set False for production runs

if EXPLAIN:
    for seg in segments[:3]:
        print(f"\n  [Detail] task={seg.task_id}")
        print(f"    workflow_steps : {seg.workflow_count}")
        print(f"    tool_steps     : {seg.tool_count}")
        print(f"    reasoning_steps: {seg.reasoning_count}")
```

---

## Good vs. Bad Examples

### BAD — Mechanical Logging

```
pipeline.core.loader | INFO | load_inputs | start | arg0=/data/inputs.json
pipeline.core.loader | INFO | load_inputs | done | result=248
pipeline.core.norm   | INFO | normalize_label | start | arg0=RAW_LABEL
pipeline.core.norm   | INFO | normalize_label | done | result=raw_label
pipeline.core.norm   | INFO | normalize_label | start | arg0=OTHER_LABEL
pipeline.core.norm   | INFO | normalize_label | done | result=other_label
... (248 more lines)
```

### GOOD — Semantic Stage Summaries

```
[Input Loaded]
  rows              : 248
  unique_tasks      : 248
  fields_present    : generation_steps, messages, metadata
  missing_gen_steps : 3
  missing_ids       : ['abc123', 'def456', 'ghi789']

[Step Segmentation]
  input_tasks       : 248
  total_steps       : 3120
  tool_steps        : 1840
  skipped_steps     : 47
  sample_task       : abc123

[Label Assignment]
  labeled           : 245
  fallback_used     : 8
  label_none        : 3
  top_labels        : {'tool_call': 1203, 'reasoning': 891, 'output': 746}

[Artifacts Written]
  trace_level.csv            : execution_results/trace_level.csv (248 rows)
  step_level.csv             : execution_results/step_level.csv (3120 rows)
  validation_sample.csv      : execution_results/validation_sample.csv (25 rows)
```

---

## Acceptance Criteria

A correct observability implementation must satisfy all of the following:

1. **Data flow is visible** — a reader can trace raw input to final output through stage summaries.
2. **Control-flow decisions are explicit** — branching, routing, labeling, fallback choices are logged.
3. **Counts appear before and after transformations** — how many in, how many out, how many filtered.
4. **Anomalies surface with context** — which IDs, what was unexpected, how many affected.
5. **Helper functions have no entry/exit logs** — observability lives at stage boundaries only.
6. **Verbose/debug tracing is opt-in** — `DEBUG` level or explicit flag; off by default.
7. **Notebook output is human-readable** — no wall of library debug logs, no raw object dumps.
8. **Third-party loggers are suppressed** — unless actively debugging that library.
9. **Business logic and schemas are unchanged** — observability is added, not mixed in.
10. **No `start`/`done` pairs on helpers** — if present, they must be removed first (see Reversal Rule).

---

## Checklist

For each new Python module:
- [ ] `logger = logging.getLogger(__name__)` at module level
- [ ] Third-party loggers suppressed in the module that configures logging
- [ ] Stage-boundary functions log semantic summaries (not `start`/`done`)
- [ ] Errors log the input identifier before re-raise
- [ ] Helper functions have no entry/exit logs
- [ ] No `print()` in production modules

For each new notebook:
- [ ] Setup cell uses `logging.INFO` (not `logging.DEBUG`) globally
- [ ] Third-party loggers suppressed explicitly in setup cell
- [ ] Every pipeline stage has one semantic print block
- [ ] Inputs printed before the call, outputs after
- [ ] Output shows counts/summaries, not full objects
- [ ] Verbose per-item traces are behind an explicit `EXPLAIN` flag
- [ ] No stage blocks on helper invocations inside a stage

---

## Related Skills

- `SKILL: design-feature-notebook` — notebook structure this skill applies to
- `SKILL: implement-feature` — observability is added per task, not at the end
- `SKILL: write-tests` — logged summaries can serve as test signal
