---
name: plan-pi-execution
description: >
  Use when a planning agent (Claude Code or Codex) has approved tasks from
  decompose-tasks and at least one task is hinted fast-code/local (i.e.
  bound for pi CLI dispatch via execute-tasks-with-pi). Clusters those
  atomic tasks into pi execution groups — sized by one demonstrable
  capability, not by task count or file — and defines the mandatory
  understanding checkpoint (notebook + Python integration test) that must
  exist before the next group may dispatch. Complements decompose-tasks
  (which produces the task list) and execute-tasks-with-pi (which dispatches
  each task): this skill is the planning step in between that decides how
  tasks are clustered and what "done" means for a cluster beyond mechanical
  verification. Triggers: "group these pi tasks", "what's the group
  boundary here", "write the GROUP.md", "is this group done", "understanding
  checkpoint for this group".
---

# SKILL: plan-pi-execution

## Scope and Boundary

| Skill | Handles |
|---|---|
| `decompose-tasks` | Breaks an approved plan into `docs/tasks/NNN.md` with per-task what/where/verify/model-hint, organized into Phases (verification-sized) and Parallel Groups N-A/N-B (scheduling-sized, for concurrency). |
| `execute-tasks-with-pi` | Dispatches each `fast-code`/`local`-hinted task as one non-interactive pi subprocess, independently re-verified, logged to `docs/specs/pi_agent_tasks/<group>/`. |
| `plan-pi-execution` (this skill) | Sits between the two above. Defines what `<group>` means: a cluster of pi-bound tasks sized by one demonstrable capability. Produces `GROUP.md` per group and gates the next group's dispatch on a mandatory understanding checkpoint. Does not change Phase/Parallel-Group schema, dispatch mechanics, or verification mechanics — it adds a capability-sized layer on top of all three. |

A pi execution group is **not** automatically equal to a Phase or a
Parallel Group. It may equal exactly one Phase, span multiple Phases (if the
capability genuinely isn't demonstrable until several phases complete —
state this explicitly, never silently merge), or contain multiple Parallel
Groups and their sync points internally (invisible at the group level). A
group must never cross a Phase's `verify-checkpoint` gate silently — each
phase's existing checkpoint still runs independently; the group-level
checkpoint defined here runs once, after the group's last task is verified.

---

## The Boundary Test (Rule 1)

A pi execution group's sizing rule and boundary test are defined once,
canonically, in `decompose-tasks`'s phase-sizing rule (§3). A pi execution
group applies that same test to the subset of a phase's tasks that are
Pi-dispatched — it is a Pi-specific refinement nested inside a phase, not
a separately defined unit. Read `decompose-tasks/SKILL.md` §3 before
drawing group boundaries.

If that sentence can't be written, the boundary is wrong:
- Two groups are really one capability split by convenience → merge them.
- One group is actually two unrelated capabilities bolted together → split it.

---

## GROUP.md — Required Artifact Per Group

Produce at `docs/specs/pi_agent_tasks/<group_id>/GROUP.md`:

```markdown
# Group: <group_id>
## Capability (one sentence)
<answer to the boundary test>

## Tasks (dispatch order, cross-referenced to docs/tasks/NNN.md task IDs)
- Task N.1 — <name>
- Task N.2 — <name>

## Depends on groups
<group_id list, or "none">

## Correctness checkpoint (commands)
<the mechanical verify commands rolled up from each task's Verify field,
plus a group-level re-verification pass per execute-tasks-with-pi's Mode A/B>

## Understanding checkpoint status
not started | notebook drafted | done | exempt (no observable behavior — reason: <state>)
```

**`group_id` naming convention:** kebab-case capability name, optionally
prefixed `YYYY-MM-DD_` — matches the existing informal convention (e.g.
`2026-07-09_visual_analysis`) so `run_pi_task.py`/`query_pi_log.py` path
defaults keep working without changes.

**No group depends on a later group** — dependency edges only ever point
backward in dispatch order.

---

## Group Coverage Audit

Run before dispatching any group. Modeled on `decompose-tasks`' own
Checkpoint Coverage Audit pattern.

- [ ] Every pi-bound task (`fast-code`/`local` hint) belongs to exactly one `group_id`.
- [ ] Every group's capability sentence is genuinely observable, or is
      marked `exempt` with a stated reason (pure refactor, dependency bump, etc.).
- [ ] No group depends on a later group.
- [ ] `execute-tasks-with-pi`'s `<group>` folder name matches `group_id` exactly.

Patch any gap before outputting `GROUP.md` files or dispatching tasks.

---

## Mandatory Understanding Checkpoint Per Group (Rule 2)

Every pi execution group with observable behavior (i.e., not marked
`exempt`) must produce **both** files below before the next group may
dispatch. This is in addition to — never instead of — the existing
mechanical correctness checkpoint (each task's verify command + independent
re-verification per `execute-tasks-with-pi`'s Mode A/B, rolled up into a
group-level `verify-checkpoint` pass). Correctness and understanding test
different things; neither substitutes for the other.

- `notebooks/understanding/<group_id>.ipynb` — stage-by-stage demonstration
  of what the group built, using real outputs pulled from the group's own
  verified pi runs, never invented examples. Follows `design-feature-notebook`'s
  existing 10-section structure and stage-function pre-check, scoped to the
  group's capability instead of the whole feature.
- `tests/integration/test_<group_id>_integration.py` — the exact Python
  equivalent, mirroring the notebook's sections as test functions, runnable
  via `pytest tests/integration/test_<group_id>_integration.py -v`.

### Authorship (non-negotiable)

**The planning agent (Claude Code) writes both files itself, directly.** Pi
is never dispatched a task to write a group's understanding notebook or its
Python equivalent — pi executes, it doesn't decide what's worth
demonstrating or why. Claude Code builds the notebook from pi's
already-verified diffs and run outputs: inspects the real merged code, runs
it, captures real output, narrates.

### Ongoing division of labor

This part already existed in `AGENTS.execution.md`'s "Notebook + Python
Equivalent Rule" — just anchored to group cadence and pi's involvement now.
AI agents test `test_<group_id>_integration.py` — it is the authoritative,
automatable check. The human runs and reads `<group_id>.ipynb` — it is the
authoritative explanation, not an optional nicety.

### Skip condition — the only valid exception

A group marked `exempt` in `GROUP.md` (no observable behavior change) does
not get a notebook. Don't force a demonstration of nothing — that reproduces
the exact "one import, one call, notebook done" anti-pattern
`design-feature-notebook` already forbids at the feature level.

### Gate strength

Producing both files is mandatory before the next group may be marked
`[done]` in `GROUP.md`. This is a production gate, not automatically an
additional hard human-approval STOP layered on top of existing Phase gates —
the human reviews on their own schedule by actually running the notebook.
If a specific group should also block on explicit human sign-off, state it
per-group in `GROUP.md`, mirroring `verify-checkpoint`'s existing
`Human sign-off required: YES` mechanism.

---

## Related Skills

- `decompose-tasks` — produces the Phase/Parallel-Group task list this
  skill clusters into pi execution groups; read its task-file format first.
- `execute-tasks-with-pi` — dispatches each group's tasks one atomic pi
  subprocess at a time; `<group>` in its output path is this skill's `group_id`.
- `design-feature-notebook` — the 10-section notebook structure and
  stage-function pre-check reused unchanged, scoped per-group instead of
  per-feature.
- `verify-checkpoint` — the correctness checkpoint reused unchanged at
  group level; never replaced by the understanding checkpoint above.
