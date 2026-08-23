---
name: verify-checkpoint
description: >
  Use at the end of every development phase before proceeding to the next phase.
  A checkpoint is a hard gate — not a suggestion. Do not begin Phase N+1 until
  Phase N checkpoint is fully verified. Triggers: "run the checkpoint", "verify
  phase N is done", reaching the end of a phase in tasks.md, or when a task
  fails and recovery is needed.
---

# SKILL: verify-checkpoint

## Purpose

A phase is not done when the code is written.
A phase is done when the checkpoint passes.

Checkpoints exist because agent-generated code frequently compiles but contains
defects. Running a checkpoint surfaces defects at the smallest possible scope —
before they compound into the next phase.

---

## Steps

1. Open `docs/tasks/<NNN>_feature.md` and find the Checkpoint block for the
   current phase.
2. Run every item in the checkpoint block — commands, assertions, artifact checks.
2b. Confirm the phase's stated Type A / Type B decision (per
    `decompose-tasks`'s phase-sizing rule):
    - **Type A** always applies — confirm the `write-tests` checks for
      this phase pass.
    - **Type B**, if the phase's task file states it applies — confirm
      the promised checkpoint-mode notebook (`design-feature-notebook`)
      exists and runs top-to-bottom. If the phase's tasks were dispatched
      through `plan-pi-execution` groups, confirm the existing
      `notebooks/understanding/<group_id>.ipynb` and
      `tests/integration/test_<group_id>_integration.py` files exist and
      pass instead — do not require a second, redundant phase-level
      notebook.
    - If Type B was promised but the notebook (or group-level equivalent)
      does not exist or does not run clean, this is a FAIL item — treat
      it exactly like any other failed checkpoint item below.
3. For each item, record: result (PASS/FAIL), actual output, notes.
4. If any item FAILS:
   - Stop. Do not patch silently and re-run.
   - Identify which task produced the failure.
   - Return to that task, fix it, and re-run the full checkpoint from item 1.
   - Do not mark any checkpoint item as passed until the full block passes.
5. If all items PASS:
   - Mark the checkpoint block in `tasks.md` as complete.
   - If `Human sign-off required: YES`, stop and produce the checkpoint summary
     below. Wait for explicit confirmation before proceeding.
   - If `Human sign-off required: NO`, proceed to Phase N+1.
6. Update `docs/session_state.md` to reflect the current completed phase.

---

## Checkpoint Output Format

After running a checkpoint, produce this block:

```
## Checkpoint: Phase N — <Phase Name>
**Status:** PASS | FAIL | PARTIAL

| Check | Result | Output |
|---|---|---|
| pytest tests/test_module.py -v | PASS | 8/8 passed |
| notebook section 4 runs top-to-bottom | PASS | shape (100, 5) confirmed |
| output file exists at execution_results/output.json | PASS | 2.3 MB |
| no hardcoded paths in core files | PASS | grep clean |

**Failures (if any):**
- None

**Next:** Phase N+1 — <next phase name>
**Human sign-off required:** YES → awaiting confirmation
```

If FAIL, produce this instead:

```
## Checkpoint: Phase N — FAILED

**Failed item:** pytest tests/test_module.py
**Actual output:** FAILED tests/test_module.py::TestLoader::test_happy_path
**Error:** AssertionError: expected list, got None

**Task to fix:** Task N.2 — load_inputs() in module/core/loader.py
**Action:** Returning to Task N.2 before re-running checkpoint.
```

---

## Specified Gates (mandatory checkpoint items)

These gates are **specified, not mechanically enforced**: they are precise and
greppable, but an executing agent must choose to run them and report honestly.
Always-fires enforcement would require hooks (PreToolUse/PostToolUse/Stop) and
is explicitly deferred to a future workstream.

Every phase checkpoint that touched Python code MUST include these three items
in its results table:

1. **Style gate:** `ruff check .` with the project's ruff config (copied from
   `templates/ruff.toml`) — result PASS only on "All checks passed!".
2. **Type-B artifact gate:** for tasks whose type is Type-B, confirm by file
   existence check that BOTH the notebook AND the integration test file named
   in the task exist (`test -f <path>` per file).
3. **Complexity budget gate:** run
   `python tools/check_complexity_budget.py --repo . --range <diff-range> --budget <N>`
   and record its `COMPLEXITY_BUDGET: PASS|FAIL ...` line VERBATIM in the
   checkpoint output. A FAIL line means the checkpoint FAILS. Copy the raw line
   into AGENT_EXECUTION_LOG.md — paraphrasing it is a task FAIL.

## Valid Checkpoint Items

A checkpoint item is valid if it has a binary result and can be run mechanically.

Valid:
- `pytest tests/test_<module>.py -v` with expected pass count
- `python -m module.runners` exits with code 0
- `python -c "from module.interfaces import X; print(X)"` prints without error
- `ruff check .` exits 0 (specified gate #1)
- `python tools/check_complexity_budget.py ... ` prints a COMPLEXITY_BUDGET line (specified gate #3)
- Specific notebook section runs from top to bottom without raising
- File exists at a specific path and is non-empty
- `grep -r "hardcoded_value" module/` returns no results
- Type A checks (`write-tests`) pass for the phase
- If Type B applies: the phase's checkpoint-mode notebook (or the
  equivalent `plan-pi-execution` group-level notebook + integration test)
  exists and runs top-to-bottom

Not valid (do not use as checkpoint items):
- "The code looks correct"
- "Should be working now"
- "Similar to what passed before"
- "No obvious errors"

If you cannot write a concrete check, the feature is not well enough specified.
Go back to the plan or spec and define what done looks like.

---

## When a Phase Keeps Failing

If a checkpoint fails more than twice on the same item:

1. Stop implementation. Do not keep patching.
2. Re-read the relevant task definition in `tasks.md`.
3. Re-read the plan section that describes this component.
4. Check whether the failing function is calling the correct module layer.
5. Add `logger.debug()` statements to trace the actual execution path.
6. Run the notebook section for this stage if one exists — it may reveal
   intermediate state issues.
7. If the root cause is still unclear after these steps, flag it as a blocker
   in `session_state.md` and stop. Do not guess.

---

## Checklist

- [ ] All items in the checkpoint block have been run (not skipped).
- [ ] Checkpoint output summary has been produced.
- [ ] Failed items are documented with actual output, not just "failed."
- [ ] `tasks.md` checkpoint block is marked complete or blocked.
- [ ] `session_state.md` is updated with current phase status.
- [ ] Human sign-off obtained if required before proceeding.

---

## Related Skills

* `SKILL: decompose-tasks` — defines the checkpoint items this skill runs
* `SKILL: handoff-coding-agent` — run after a checkpoint if session is ending
* `SKILL: implement-feature` — verify-checkpoint is called at the end of each phase
