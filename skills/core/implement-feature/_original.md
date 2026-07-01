---
name: implement-feature
description: >
  Use when starting implementation of any substantial new feature. Always use
  before writing any code. Jumping straight to implementation without discovery,
  a plan, and a task breakdown leads to wrong module placement, duplicate logic,
  and missing documentation. This skill orchestrates the full workflow from
  discovery to verified, documented feature.
---

# SKILL: implement-feature

## Trigger

Use this skill when:
* Starting any new feature that touches more than one file.
* Resuming a feature after a stopped session (read session_state.md first).
* A human describes something to build and no spec yet exists.

---

## Full Workflow

```
discover-codebase
    ↓
write-spec (if none exists)
    ↓ [Human confirms spec]
write-plan
    ↓ [Human confirms plan]
decompose-tasks
    ↓ [Human confirms tasks]
    ┌──────────────────────────────────────┐
    │  For each phase in tasks.md:         │
    │    For each task in phase:           │
    │      implement task                  │
    │      add-observability               │
    │      write-tests (same task)         │
    │    verify-checkpoint                 │
    │    handoff-coding-agent (if stopping)│
    └──────────────────────────────────────┘
    ↓ [All phases complete]
design-feature-notebook
    ↓
update-docs + update-system-diagram + update-codebase-map
    ↓
self-check (CLAUDE.md)
```

---

## Steps

### Step 1: Discover
Run `SKILL: discover-codebase`. Read `CODEBASE_MAP.md`. Identify all modules,
files, and functions related to this feature before touching anything.

### Step 2: Spec
Check `docs/specs/` for an existing spec. If none exists, run `SKILL: write-spec`
and wait for human confirmation before proceeding. Do not plan without a confirmed spec.

### Step 3: Plan
Run `SKILL: write-plan`. Produce `docs/plans/<NNN>_<feature>.md`.
Wait for human confirmation of the plan before proceeding to tasks.

### Step 4: Decompose
Run `SKILL: decompose-tasks`. Produce `docs/tasks/<NNN>_<feature>.md`.
Each task must be atomic, time-bounded, and have a concrete Verify step.
Wait for human confirmation of the task breakdown before writing any code.

### Step 5: Implement — One Phase at a Time

For each phase in `tasks.md`:

1. Execute tasks in the phase in dependency order.
   - For each task:
     - Write the exact code described — no more, no less.
     - Apply `SKILL: add-observability` per function (logging) and notebook section (print blocks).
     - Write the unit test described in the task's Verify step (`SKILL: write-tests`).
     - Run the task's Verify step before marking `[x]`.
     - Mark the task `[x]` in `tasks.md` only after its Verify step passes.

2. After all tasks in the phase are complete, run `SKILL: verify-checkpoint`.

3. If the checkpoint fails:
   - Return to the failing task and fix it.
   - Do not patch silently and mark it passed.
   - Re-run the full checkpoint from the beginning.

4. If stopping after this checkpoint, run `SKILL: handoff-coding-agent`.

5. If checkpoint passes and continuing, proceed to the next phase.

**Do not bundle tasks across phases. Do not skip checkpoints.**

### Step 6: Notebook
After all phases are complete, run `SKILL: design-feature-notebook`.
The notebook demonstrates the completed feature end-to-end with full observability
per `SKILL: add-observability`.

### Step 7: Documentation
Run all of the following in the same change set:
- `SKILL: update-docs`
- `SKILL: update-codebase-map`
- `SKILL: update-system-diagram`

### Step 8: Self-Check
Work through the self-check in `CLAUDE.md` before closing the task.

---

## Rules

1. Never write code before steps 1–4 are complete and confirmed.
2. Implement one task at a time. Do not implement an entire phase before testing any of it.
3. Never mark a task `[x]` before its Verify step passes.
4. Never begin a new phase before the previous phase's checkpoint passes.
5. Do not silently expand scope. If you notice something broken outside your scope, flag it in `session_state.md`. Do not fix it.
6. If implementation diverges from the plan, update `docs/plans/<NNN>.md` before continuing.
7. One task = one focused change. Do not bundle unrelated changes into one task.

---

## Related Skills

* `SKILL: discover-codebase` — Step 1
* `SKILL: write-spec` — Step 2
* `SKILL: write-plan` — Step 3
* `SKILL: decompose-tasks` — Step 4
* `SKILL: add-observability` — Step 5 (per task)
* `SKILL: write-tests` — Step 5 (per task)
* `SKILL: verify-checkpoint` — Step 5 (per phase)
* `SKILL: handoff-coding-agent` — Step 5 (if stopping)
* `SKILL: design-feature-notebook` — Step 6
* `SKILL: update-docs` — Step 7
* `SKILL: update-codebase-map` — Step 7
* `SKILL: update-system-diagram` — Step 7
