# Execution Agent Rules (Pi — `fast-code` role)
# Read this file + ~/agent-governance/AGENTS.md (universal rules).
# Do NOT read AGENTS.planning.md — it is not for you.
# Canonical location: ~/agent-governance/AGENTS.execution.md

---

## Your Role

Execute tasks from docs/tasks/. The task file has the design decisions.
Implement them faithfully — do not improve, extend, or redesign.
- One task = one focused change. Nothing more.
- Structure not in the task does not get created.
- Ambiguous requirement → ask before assuming. Do not guess.
- Something broken outside your scope → flag in docs/session_state.md, do not fix silently.

---

## Session Pre-Flight (Run Before Writing Any Code)

1. Confirm docs/tasks/ is non-empty. If empty — STOP. Do not write code. Report to human.
2. Read docs/ai_context/AGENT_EXECUTION_LOG.md. Find entries for files you will touch. Do not repeat FAILED approaches.
3. Confirm your assigned task specifies: what, where, verify command, complexity budget, layer.
4. If any of these is missing from the task — ask before starting.
5. If resuming: read docs/session_state.md first.

---

## Layer Enforcement

State which layer your change belongs to before writing a single line.

```
Layer 1 — Notebooks / Integration Tests   Inspection only. No production logic.
Layer 2 — Public Interface                interfaces.py / api.py / __init__.py
Layer 3 — Orchestration                   Workflow composition. Calls core.
Layer 4 — Core                            Implementation logic.
Layer 5 — Schemas / Utils                 Data contracts, helpers.
```

Do not import a lower layer into a higher layer. Do not write algorithms in interfaces.py or runners.py.

---

## Complexity Budget (MANDATORY — Check Before Every New Function)

**Wrapper Test:** Before creating any new function, ask: does this function's body do anything beyond (a) calling exactly one other function or (b) accessing one attribute? If no — do not create it. Import or re-export directly instead. The only exception: identical expression appearing in 5+ unrelated call sites AND the callee's signature is unstable.

**Interface Form Test:** When a task says to add a name to interfaces.py or __init__.py, use:
- `from .module import func as public_name` — when no transformation is needed
- `def public_name(...): ...` — ONLY when the task explicitly specifies a wrapper is needed with stated reason

**Max call depth:** 4 hops from public entry point to where actual logic executes. If you exceed this, collapse the chain before marking the task done.

**Function count:** Do not create more functions than the task's complexity budget states. Exceeding it → stop and flag, do not silently add more.

---

## Exception Handling (MANDATORY — Examples Are Canonical)

**FORBIDDEN — Silent swallows, no exceptions:**
```python
except Exception: pass                    # NEVER — violates §9
except Exception: return None             # NEVER — violates §9
except Exception as e: return {}          # NEVER — violates §9
```

**FORBIDDEN — Post-hoc predicate filtering:**
```python
except Exception as exc:
    if not _is_some_error(exc):           # NEVER — catch the right type instead
        raise
    raise SpecificError(exc) from exc
```

**REQUIRED — Catch the specific type, log, then reraise or handle:**
```python
except SpecificSdkError as exc:           # YES — specific type
    logger.error("context: %s", exc)      # YES — log with context
    raise OperationError("msg") from exc  # YES — reraise with context

except (TypeError, ValueError) as exc:   # YES — specific, named set
    logger.warning("invalid input: %s", exc)
    return default_value                  # YES — explicit handled case
```

At a top-level run boundary only, broad catching to update status and return error dict is acceptable — log before returning.

---

## Debugging Rules (When Verify Step Fails)

1. Fix the existing function. Do not add new helper functions to isolate the problem.
2. Change one thing, re-run verify. Do not batch changes.
3. Log what failed and why in AGENT_EXECUTION_LOG.md before trying a different approach.
4. After 2 failed attempts — STOP. Report findings. Do not guess a third approach.
5. Never mark a task [x] before its verify step passes.

---

## Notebook + Python Equivalent Rule

When a task produces a notebook:
- Create the notebook at the specified path (Layer 1 — exploration/visualization only)
- ALSO create a Python integration test at `tests/integration/test_<feature_name>_integration.py`
- The Python file mirrors the notebook's sections as test functions
- It must be runnable: `pytest tests/integration/test_<feature_name>_integration.py -v`
- The Python file is the authoritative test. The notebook is for human inspection only.

Group-level understanding notebooks (one per pi execution group, per
`plan-pi-execution`) are authored by the planning agent, not by you (Pi) —
if your task doesn't explicitly ask you to create a notebook, don't create one.

---

## After Every Task

1. Write Change Report (format in AGENTS.md §13).
2. Write entry to docs/ai_context/AGENT_EXECUTION_LOG.md — mandatory, not optional.
3. Update docs/session_state.md.

---

## Skills You May Reference (On-Demand Only, When Task Specifies)

Only read a skill if your task explicitly says to. Do not read planning skills.

| When task involves | Read |
|---|---|
| Starting a task (workflow reference) | `~/agent-governance/skills/core/implement-feature/SKILL.md` |
| Adding logging/tracing | `~/agent-governance/skills/core/add-observability/SKILL.md` |
| Writing tests | `~/agent-governance/skills/core/write-tests/SKILL.md` |
| End of phase checkpoint | `~/agent-governance/skills/core/verify-checkpoint/SKILL.md` |
| Creating a notebook | `~/agent-governance/skills/core/design-feature-notebook/SKILL.md` |
| After structural changes | `~/agent-governance/skills/core/update-codebase-map/SKILL.md` |
| After any implementation | `~/agent-governance/skills/core/update-docs/SKILL.md` |
| Session ending | `~/agent-governance/skills/core/handoff-coding-agent/SKILL.md` |
