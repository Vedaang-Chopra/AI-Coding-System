# Spec: Pi Execution Grouping & Understanding Checkpoints
**ID:** 003
**Status:** Implemented

## Purpose

`decompose-tasks` already produces Phases (verification-sized) and Parallel
Groups N-A/N-B (scheduling-sized, for concurrency). Neither is guaranteed to
correspond to something a human can look at and recognize as "one capability
the system now has." `execute-tasks-with-pi` already writes into a
`docs/specs/pi_agent_tasks/<group>/` folder, but `<group>` has never been
formally defined.

Confirmed by inspection: the CAD Design project's real
`docs/specs/pi_agent_tasks/` directory uses ad hoc labels like
`2026-07-09_visual_analysis` — a date prefix plus a free-text slug the
planning agent happened to pick, with no `GROUP.md`, no stated capability,
no coverage audit, and no understanding-checkpoint artifact alongside it.
This confirms the gap this spec closes: `<group>` needs a formal
definition, and every group needs a mandatory understanding checkpoint
before the next one can be dispatched.

This is being built now because task execution is moving to
`execute-tasks-with-pi` (cheap execution model, one atomic pi dispatch per
task) while all planning/architecture decisions stay with Claude Code /
Codex. The existing notebook + Python-equivalent rule
(`AGENTS.execution.md` "Notebook + Python Equivalent Rule",
`design-feature-notebook`) already covers demonstrating a whole feature at
the end — that machinery is reused unchanged. What's missing is (a) a
planning unit sized to "one demonstrable capability" so the checkpoint can
fire more than once per feature, at pi's atomic execution grain, and (b) an
explicit statement that pi never authors that checkpoint's artifacts —
Claude Code does, from pi's already-verified diffs and outputs.

## Affected Modules

- NEW: `~/agent-governance/skills/core/plan-pi-execution/SKILL.md`
- `~/agent-governance/AGENTS.planning.md`
- `~/agent-governance/SYSTEM_OVERVIEW.md`
- `~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md`
- `~/agent-governance/AGENTS.execution.md`

## Out of Scope

- Retrofitting any already-completed `pi_agent_tasks/<group>/` directories
  in active projects (e.g. CAD Design's `2026-07-09_visual_analysis`) to
  the new `GROUP.md` format.
- Changing `decompose-tasks`' Phase / Parallel-Group task schema itself —
  groups sit alongside it, not replacing it.
- Changing `execute-tasks-with-pi`'s dispatch or independent-verification
  mechanics (Mode A/B, the JSON run log schema, `run_pi_task.py` /
  `query_pi_log.py`) — only its group-name sourcing is clarified.
- Changing `verify-checkpoint`'s mechanics — reused unchanged at group level.
- Changing `design-feature-notebook`'s 10-section structure or
  stage-function pre-check — reused unchanged; only cadence (per-group, not
  only per-feature) and authorship are clarified.
- Any change to `~/agent-governance/AGENTS.md` (the universal file read by
  Pi too) — grouping and understanding-checkpoint authorship are
  planning-agent-only concerns.
- Any change to project-specific `CLAUDE.md` files, or bootstrap deployment
  of the new skill into active projects — a separate, later manual step.

## Acceptance Criteria

- [ ] `plan-pi-execution/SKILL.md` exists at
      `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` and defines:
      the one-sentence capability boundary test, the `GROUP.md` template, the
      Group Coverage Audit, and states the understanding checkpoint is
      authored by Claude Code, never by pi.
- [ ] `AGENTS.planning.md`'s Planning Phase Protocol contains a Step 4b — Pi
      Execution Grouping, positioned between the existing Step 4 (Task
      Decomposition) and Step 5 (Checkpoint Coverage Audit), gated so it only
      runs when at least one task is hinted `fast-code`/`local`, with its own
      explicit completion criteria.
- [ ] `AGENTS.planning.md`'s Conditional Skill Reads table has a new row
      pointing to `plan-pi-execution`.
- [ ] `AGENTS.planning.md`'s Planning Self-Check has a new line covering
      group-level checkpoints.
- [ ] `SYSTEM_OVERVIEW.md` §5's workflow diagram shows the grouping +
      understanding-checkpoint step as a gate between `decompose-tasks` and
      the `[Pi receives execution prompt:]` block.
- [ ] `SYSTEM_OVERVIEW.md` §8 lists `plan-pi-execution` with the same
      What/Invoke/Produces/Key-gates format as every other entry, and every
      place that states the core skill count (currently "24") is updated to
      reflect the addition.
- [ ] `SYSTEM_OVERVIEW.md` §10 Forbidden Patterns gains two new entries:
      dispatching a group's understanding notebook to pi, and marking a
      group `[done]` without both understanding-checkpoint files or an
      explicit exemption.
- [ ] `SYSTEM_OVERVIEW.md`'s "Last updated" date is bumped.
- [ ] `execute-tasks-with-pi/SKILL.md`'s Scope-and-Boundary table references
      `plan-pi-execution`; its Setup section states `<group>` is
      `plan-pi-execution`'s `group_id`, not an ad hoc label; `plan-pi-execution`
      appears in its Related Skills list.
- [ ] `AGENTS.execution.md` has one new line under "Notebook + Python
      Equivalent Rule" telling Pi it does not author group-level
      understanding notebooks unless its own task explicitly asks for one.
- [ ] `grep -ri "group\|notebook author" ~/agent-governance/AGENTS.md` returns
      no new matches introduced by this change — the universal file is
      untouched.
- [ ] Nowhere in the new or edited material does the understanding notebook
      get described as a substitute for `verify-checkpoint`, or vice versa —
      both are explicitly required, independent gates.

## Validation Plan

- `test -f ~/agent-governance/skills/core/plan-pi-execution/SKILL.md`
- `grep -n "Step 4b" ~/agent-governance/AGENTS.planning.md`
- `grep -n "plan-pi-execution" ~/agent-governance/AGENTS.planning.md ~/agent-governance/SYSTEM_OVERVIEW.md ~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md`
- `grep -n "core skills (25)\|Core Skills (25)" ~/agent-governance/SYSTEM_OVERVIEW.md` (or whatever the corrected count becomes)
- `grep -n "group" ~/agent-governance/AGENTS.md` — expect no new hits vs. current committed version (`git diff` on this file should be empty)
- `git diff --stat` after implementation shows AGENTS.md absent from the changed-files list
- Manual read-through of `plan-pi-execution/SKILL.md` confirming the
  boundary test, `GROUP.md` template, Group Coverage Audit, and authorship
  rule are all present and internally consistent with
  `execute-tasks-with-pi` and `verify-checkpoint`.

## Known Risks / Limitations

- The `group_id` naming convention (format, whether date-prefixed like the
  existing informal CAD Design pattern) is not fully specified by the brief.
  Default proposed in the plan: kebab-case capability name, optionally
  date-prefixed, matching the existing informal convention observed on disk
  so existing tooling (`run_pi_task.py`, `query_pi_log.py` path defaults)
  keeps working without changes.
- This spec only changes governance documents/skills, not any project's
  live `docs/tasks/` or `docs/specs/pi_agent_tasks/` state — a project must
  separately adopt `plan-pi-execution` the next time it plans pi-bound work.
- Because `AGENTS.md` must remain untouched, any future temptation to make
  grouping a universal (Pi-visible) concept would require a follow-up spec,
  not a quiet edit to this one.

## Open Questions

None — the brief resolves all design decisions needed to write the plan.
