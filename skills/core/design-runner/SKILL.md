---
name: design-runner
description: Use when designing, writing, or refactoring any `runners.py` or pipeline orchestration file — before writing stage or workflow logic. Use this skill whenever you're structuring a multi-step pipeline, even if only adding one new stage. Runners written without this pattern tend to mix orchestration with logic, making stages untestable in isolation.
---

# Design Runner

A runner orchestrates stages — it does not implement them. Keep orchestration and logic strictly separated.

## Steps

1. List all logical stages in the workflow (e.g., load → process → generate → evaluate → output).
2. Create one function per stage. Each function must have:
   - Single responsibility
   - Typed inputs and typed outputs
   - A one-sentence docstring
3. Create a `run_full_pipeline()` (or equivalently named function) that only calls stage functions in sequence — no logic of its own.
4. Verify: can you call any single stage independently without running the full pipeline? If not, decompose further.
5. Place each stage function in `runners.py` or the appropriate `core/` submodule. Do not mix orchestration and logic in the same file.

## Pattern

```python
def load_inputs(path: str) -> Inputs:
    """Load and validate inputs from disk."""
    ...

def run_stage_a(inputs: Inputs) -> StageAOutput:
    """Run stage A processing on inputs."""
    ...

def run_stage_b(output: StageAOutput) -> FinalOutput:
    """Run stage B given stage A output."""
    ...

def run_full_pipeline(path: str) -> FinalOutput:
    """Orchestrate the full pipeline end-to-end."""
    inputs = load_inputs(path)
    stage_a = run_stage_a(inputs)
    return run_stage_b(stage_a)
```

The pipeline function is a call list, not a logic block. If you find yourself writing conditionals in `run_full_pipeline`, extract them into a stage.

## Related Skills

* `SKILL: design-layered-module` — owns the full five-layer model this
  skill's Tier 2 pattern lives inside; read that skill first when the task
  touches module structure more broadly than just `runners.py` itself.
