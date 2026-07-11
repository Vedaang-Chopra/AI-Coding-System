---
name: decompose-tasks
description: Break down approved plans into executable agent tasks. Produces docs/tasks/NNN_feature_name.md with per-task what/where/how/model-hint/verify.
---

# Skill: decompose-tasks
# When to use: After write-plan is approved by human. Produces the agent task file.
# Prerequisite: Confirmed spec at docs/specs/, approved plan at docs/plans/
# Output: docs/tasks/NNN_feature_name.md + docs/execution-plans/NN-seq-exec-prompt.md

---

## 1. Inputs — read before starting

- `docs/specs/NNN_feature_name.md` — confirmed spec
- `docs/plans/NNN_feature_name.md` — approved technical plan
- `docs/ai_context/CODEBASE_MAP.md` — what exists, module ownership
- `docs/ai_context/AGENT_EXECUTION_LOG.md` — known failures and anti-patterns
- Project AGENTS.md → Model Registry section — available model aliases

---

## 2. Task format — required for every task

Every task entry must include all of the following fields.
Omitting any field means the task is not executable by a smaller model.

```markdown
### Task [N.M] — [Name]
**Phase:** N
**Parallel group:** [N-A | N-B | sequential]
**Depends on:** [Task IDs or none]
**Model hint:** [alias from Model Registry]
**Rate limit flag:** yes | no
**Fallback model:** [alias]
**Layer:** [Layer 1–5 and name]
**File(s):**
  - `src/module/file.py` — [create | modify]
**What to build:** [exact description — specific enough that a model with no context can execute]
**Function signatures (if applicable):**
  ```python
  def function_name(arg1: Type1, arg2: Type2) -> ReturnType:
  ```
**Input shape / output shape:** [if data-processing task]
**Verify:**
  ```
  pytest tests/test_name.py::test_function -v
  ```
  Expected: [what passing looks like]
**Checkpoint:** [which phase checkpoint this task contributes to]
**AGENT_EXECUTION_LOG notes:** [any known failure patterns from the log relevant to this task; "none" if clean]
**Complexity budget:** <N new functions expected>
**Max call depth:** ≤4
**Interface form constraint:** Re-export only | Wrapper (reason: <state>) | N/A
**Error contract:** Returns <type> on success | Returns None / raises <Error> on failure
**Notebook equivalent:** Yes — also produce tests/integration/test_<feature>_integration.py | No
```

---

## 3. Phase and group structure

Organize tasks into phases matching the technical plan.
Within each phase, run the dependency analysis from `parallel-execution.md` §2
before assigning groups.

### Phase sizing rule (canonical — do not restate elsewhere)

A phase is not a task count and not an arbitrary boundary. A phase is:

> **A sequence of related tasks that, together, produce one demonstrable capability — something with a verifiable goal, small enough to execute unsupervised, large enough that checking after every individual task would be wasteful.**

**Boundary test — must be answerable in one sentence:** *"Once every task
in this phase is done, what can the system now demonstrably do that it
couldn't before?"* If that sentence can't be written, the boundary is
wrong: two phases are really one capability split by convenience (merge
them), or one phase is actually two unrelated capabilities bolted together
(split it).

A phase is valid when all of the following hold:
- Tasks in it are related in sequence (each builds toward the same capability).
- There is something concrete to point at when it's done (a function that
  runs, an output that exists, a behavior that's observable) — not just
  "code was written."
- It is small enough to hand to an execution agent and walk away, not so
  large that a failure midway is expensive to diagnose.

This is the same test `plan-pi-execution` uses for a pi execution group's
boundary — a group is this same rule applied to the subset of a phase's
tasks that are Pi-dispatched, nested inside the phase rather than an
independent unit. `plan-pi-execution` points here rather than restating
the rule.

### Two test types — required per phase

Every phase's task output must state which of two distinct verification
types apply:

- **Type A — Syntactical (for the agent).** The existing `write-tests`
  skill, unchanged. Confirms the code is correct. Always applies to every
  phase.
- **Type B — Understanding checkpoint (for the human).** A lightweight,
  per-phase Jupyter notebook (checkpoint mode — see
  `design-feature-notebook`) that lets a human see what was built in this
  phase without reading a diff. Not every phase gets one — it applies when
  the phase produced new or materially changed code, not for setup,
  config, or non-generative work. State the decision with a one-line
  reason (e.g., "Phase 2: no notebook — dependency install only" /
  "Phase 3: notebook required — new extraction pipeline built"). For a
  phase whose tasks were dispatched through `plan-pi-execution` groups,
  Type B is satisfied by the existing group-level understanding-checkpoint
  files — do not require a second, redundant phase-level notebook.

```markdown
## Phase N — [Phase Name]
**Goal:** [one sentence]
**Entry condition:** [what must be true before this phase starts]
**Exit condition (checkpoint):** [what must be true for this phase to be complete]
**Type A:** write-tests (always applies)
**Type B:** [yes — <one-line reason> | no — <one-line reason>]

### Dependency Analysis
| Task | Reads from | Writes to | Depends on |
|---|---|---|---|
| N.1 | ... | ... | none |
| N.2 | ... | ... | N.1 |

### Group N-A — Parallel | Sequential
[tasks]

### *** SYNC POINT N-A ***
- [ ] Task N.1 verify passes
- [ ] Task N.2 verify passes
- [ ] No unresolved errors

### Group N-B — ...
[tasks]

### Task N.final — verify-checkpoint
**What:** READ ~/agent-governance/skills/core/verify-checkpoint.md and run all gates.
**Model hint:** complex-reasoning
**Rate limit flag:** no
**HARD STOP after this task — wait for human approval before Phase N+1.**
```

---

## 4. Checkpoint coverage audit (run before outputting the task file)

After drafting all tasks, answer every question below.
Patch any gap before outputting.

- [ ] Does every module the feature touches have a task covering `interfaces.py`?
- [ ] Does every required output file (JSON, manifest, config, schema) have a task that owns writing it?
- [ ] Does every behavior in the confirmed spec appear in at least one task's "what to build"?
- [ ] Does every phase have a `verify-checkpoint` task as its final task?
- [ ] Does every parallel group have a sync point immediately following it?
- [ ] Have all FAILED patterns from `AGENT_EXECUTION_LOG.md` been noted in affected tasks?
- [ ] Does every task have a model hint and a fallback?
- [ ] Are tasks using the same free-tier model in the same parallel group? (If yes, stagger or reassign.)
- [ ] Does every task touching `interfaces.py` or `__init__.py` have an Interface Form Constraint field completed?
- [ ] Does every task adding a public function have an Error Contract field completed?
- [ ] Does every task producing a notebook also produce a Python integration test at `tests/integration/`?

---

## 5. Model hint assignment guidelines

Assign hints based on task complexity, not preference:

| Task type | Recommended alias |
|---|---|
| Schema definition, simple data class | `local` or `fast-code` |
| Single function with clear spec | `fast-code` |
| Multi-function module with state | `complex-reasoning` |
| Debugging / root cause analysis | `complex-reasoning` |
| Integration task (wiring modules) | `complex-reasoning` |
| Simple rename / format / import fix | `local` |
| Test writing for a well-specced function | `fast-code` |
| Documentation update | `local` |
| verify-checkpoint execution | `complex-reasoning` |

Rate limit flag is `yes` if the primary model alias maps to a free-tier API model.
Always specify a fallback that is either paid-tier or local.

---

## 6. Execution prompt (mandatory output)

After the task file is produced and approved by the human, produce this file.
Do not wait to be asked. It is a required output of this skill.

**Output path:** `docs/execution-plans/NN-seq-exec-prompt.md`

```markdown
# Sequential Execution Prompt — [Feature Name]
# Copy this entire prompt and paste it as the first message to Pi (or other executing agent).

---

You are executing a pre-planned feature implementation for [PROJECT_NAME].
Read and follow exactly. Do not improvise.

## PRE-FLIGHT CHECK (Run Before Writing Any Code)
1. Confirm `docs/tasks/<feature>.md` is non-empty and has your task assigned.
2. If `docs/tasks/` is empty or your task is not present — STOP. Do not write code. Report to human.
3. Read `docs/ai_context/AGENT_EXECUTION_LOG.md`. Note any FAILED entries for files you will touch.
4. Confirm your task has all required fields including complexity budget, layer, and verify command. If missing — ask before starting.

## Before starting
1. Read ~/agent-governance/AGENTS.md fully.
2. Read this project's AGENTS.md fully.
3. Read docs/ai_context/DOC_TAXONOMY.md.
4. Read docs/ai_context/CODEBASE_MAP.md.
5. Read docs/ai_context/AGENT_EXECUTION_LOG.md — do not repeat anything marked FAILED.
6. Read docs/session_state.md — resume from where it indicates if mid-session.

## Task file
All tasks are in: docs/tasks/NNN_feature_name.md
Current status of each task is tracked there ([ ] = pending, [x] = complete).

## Execution loop
For each task in order:
1. Read the task entry fully.
2. Check AGENT_EXECUTION_LOG.md for known failure patterns on files this task touches.
3. Select model from task's `Model hint` field using the project Model Registry.
4. Execute the task.
5. Run the `Verify` command. If it fails:
   a. Diagnose the failure.
   b. Fix and re-run verify. Max 2 fix attempts.
   c. If still failing after 2 attempts: stop, write failure to AGENT_EXECUTION_LOG.md,
      update session_state.md, output a summary, and stop the session.
6. Mark the task `[x]` in the task file only after Verify passes.
7. Write Change Report (per AGENTS.md §13).
8. Write AGENT_EXECUTION_LOG.md entry.
9. Update docs/session_state.md.

## Parallel group handling
At SYNC POINT markers: verify all tasks in the preceding group are `[x]` before proceeding.
If any task is not `[x]`: stop and fix before proceeding.

## Phase boundaries
At every `verify-checkpoint` task: READ ~/agent-governance/skills/core/verify-checkpoint.md.
After the checkpoint task is `[x]`: STOP and output a summary. Wait for human confirmation.

## Context window management
Monitor context usage. At approximately 60–70% context consumed:
1. Complete the current task fully (do not stop mid-task).
2. Write AGENT_EXECUTION_LOG.md entry for the completed task.
3. Update docs/session_state.md with exact resume point.
4. Output the following message:
   "Context at [X]%. Stopping cleanly after task [N.M].
    Next task: [N.M+1 — name].
    Resume by starting a new session with this execution prompt."
5. Stop. Do not start the next task.

## Rate limit handling
If a model returns 429: wait 60 seconds, retry once.
If still rate-limited: use the task's `Fallback model` alias. Log the substitution.

## What you may not do
- Do not skip a task.
- Do not mark a task [x] before its Verify passes.
- Do not proceed past a SYNC POINT if any task in the group failed.
- Do not proceed past a phase checkpoint without human confirmation.
- Do not invent structure or modify files outside the task's specified File(s).
- Do not repeat any approach marked FAILED in AGENT_EXECUTION_LOG.md.
```

---

## 7. Output checklist

Before presenting the task file and execution prompt to the human:

- [ ] Every task has all required fields (§2).
- [ ] Dependency analysis table is present for every phase.
- [ ] Parallel groups are correctly identified and sync points are placed.
- [ ] Checkpoint coverage audit (§4) passed with no gaps.
- [ ] Model hints and fallbacks are assigned to every task.
- [ ] Free-tier model tasks in the same parallel group are staggered or reassigned.
- [ ] Execution prompt is produced at the correct path.
- [ ] `docs/session_state.md` is updated to show planning complete, tasks ready.

---

## Related Skills

- `execute-tasks-with-pi` — an alternative to this skill's own §6 Sequential
  Execution Prompt (one long interactive pi session working through many
  tasks) for `fast-code`/`local`-hinted tasks: dispatches one non-interactive
  pi call per atomic task instead, with independent re-verification after
  each one. Prefer it when the execution model has a known reliability gap on
  compound instructions.
- `verify-checkpoint` — run at every phase's final task.
- `handoff-coding-agent` — write `docs/session_state.md` when a session ends
  mid-execution.
