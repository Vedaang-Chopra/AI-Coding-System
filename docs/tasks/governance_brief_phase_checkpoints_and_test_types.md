# Governance Fix Brief — Phase-Sized Checkpoints & Two Test Types
**Date:** 2026-07-11
**For:** Claude Code (implementation agent)
**Written by:** Human + Claude (planning session)
**Status:** Ready for spec → plan → implementation
**Supersedes:** `governance_pi_execution_planning_brief.md` (see §0 — read that file first, then treat it as retired)

---

## Purpose

Claude Code's job in this system is to design features for a smaller execution
model (Pi) to build step-by-step. Plans get broken into tasks; tasks get grouped
into **phases**; a phase runs through Pi sequentially; only at the end of a
phase does the human check what was built. This brief fixes two gaps in how
phases and verification currently work:

1. **Phase sizing is undefined.** `decompose-tasks` currently says every phase
   ends with a `verify-checkpoint` task, but never says what makes a valid
   phase. Nothing stops a phase from being one task or twenty unrelated ones.
2. **Only one type of test exists.** Plans currently only account for pytest-style
   correctness checks (for the agent). There is no mechanism for a
   human-readable checkpoint — something the human can open and read to
   understand what was actually built, without reading a diff.

This is a planning-layer fix. It changes how Claude Code writes plans and task
lists — it does not touch execution-agent behavior beyond what's noted in §0.

---

## §0 — What Claude Code Must Do First

1. Read `~/agent-governance/AGENTS.md` fully.
2. Read `~/agent-governance/SYSTEM_OVERVIEW.md` fully.
3. Locate and read `governance_pi_execution_planning_brief.md` (from a prior
   session — check `docs/specs/`, `docs/plans/`, or wherever prior briefs are
   filed). That brief proposed a new `plan-pi-execution/SKILL.md` plus edits
   to `AGENTS.planning.md`, `SYSTEM_OVERVIEW.md`, `execute-tasks-with-pi/SKILL.md`,
   and `AGENTS.execution.md`. **Do not execute that brief as written.** Its
   substance — capability-sized groups, notebook + Python-equivalent as a
   mandatory checkpoint artifact — is correct and must be preserved, but it
   belongs in the general planning skills below, not in a new Pi-specific
   skill file. Extract what's useful from it, then mark it superseded (move
   to `archive/` per the `deprecate-code` pattern, with a header pointing to
   this brief as the replacement).
4. Read the following skill files fully:
   - `~/agent-governance/skills/core/decompose-tasks/SKILL.md`
   - `~/agent-governance/skills/core/verify-checkpoint/SKILL.md`
   - `~/agent-governance/skills/core/design-feature-notebook/SKILL.md`
   - `~/agent-governance/skills/core/write-plan/SKILL.md`
   - `~/agent-governance/skills/core/write-tests/SKILL.md`
5. Write a spec at `docs/specs/NNN_phase_checkpoints_and_test_types.md`.
6. **HARD STOP — do not proceed without human approval.**

---

## Problem 1 — Phase Has No Sizing Rule

### What's needed

A phase is not a task count and not an arbitrary boundary. A phase is:

> **A sequence of related tasks that, together, produce one demonstrable
> capability — something with a verifiable goal, small enough to execute
> unsupervised, large enough that checking after every individual task would
> be wasteful.**

Concretely, a phase is valid when all of the following hold:
- Tasks in it are related in sequence (each builds toward the same capability).
- There is something concrete to point at when it's done (a function that
  runs, an output that exists, a behavior that's observable) — not just
  "code was written."
- It is small enough to hand to Pi and walk away, not so large that a failure
  midway is expensive to diagnose.

### Skill to fix

`~/agent-governance/skills/core/decompose-tasks/SKILL.md`

Add this sizing rule explicitly to the phase-definition section. Add it to the
Checkpoint Coverage Audit as a checkable item: "Does every phase map to one
stated capability, not a task count?"

---

## Problem 2 — Only One Test Type Is Planned For

### What's needed

Every phase's task list must account for **two distinct kinds of verification**,
and the plan/task output must say explicitly which apply:

**Type A — Syntactical (for the agent).**
Existing `write-tests` skill, unchanged. Confirms the code is correct.
Always applies. No change needed to how Claude decides what to write here —
this is just now named explicitly as "Type A" in the plan/task output so it's
distinguishable from Type B below.

**Type B — Understanding checkpoint (for the human).**
A Jupyter notebook that lets the human open one file and see what was built
in this phase, without reading a diff. **Not every phase gets one.** It applies
when the phase produced new or materially changed code — not when a phase was
setup, config, reading existing code, or similar non-generative work. Claude
decides per phase whether Type B applies, and must state that decision with a
one-line reason in the task output (e.g., "Phase 2: no notebook — dependency
install only" / "Phase 3: notebook required — new extraction pipeline built").

When Type B applies, the notebook:
- Runs top-to-bottom sequentially, no hidden state.
- Breaks the phase's work into simple, readable steps — not a single call to
  one wrapper function (this is already the failure mode described in
  `design-feature-notebook`'s existing forbidden patterns; the checkpoint
  notebook must avoid it the same way).
- Is not required to have a fixed section count or be exhaustive. It exists
  to let the human understand what changed and decide if the next phase needs
  adjustment — not to serve as the formal per-feature notebook described
  below. Visuals/plots are encouraged where they clarify what happened, but
  are not mandatory.
- Should be paired with a Python-equivalent file when the phase's output needs
  to be re-runnable by an agent later, following the same pattern already used
  for feature notebooks.

### Distinction from the existing feature notebook

`design-feature-notebook/SKILL.md` already defines a full, 10-section notebook
required at feature completion, with strict structure (Purpose, Setup, Test
Inputs, Public Entry Point Check, Stage-by-Stage Inspection, Assertions,
Edge Cases, Artifacts, Debugging Notes, Summary). **Do not duplicate this.**
The checkpoint notebook (Type B, above) is a lighter-weight sibling mode within
the same skill file — same file, same skill, two modes:
- **Feature-level mode** (existing): full 10-section notebook, produced once
  when a feature is complete.
- **Checkpoint mode** (new): lightweight, sequential, produced per-phase when
  the phase warrants it, no fixed structure required.

Add this as a new subsection within `design-feature-notebook/SKILL.md` rather
than creating a second notebook skill file.

### Skill to fix

`~/agent-governance/skills/core/design-feature-notebook/SKILL.md` — add
checkpoint mode as described above.

`~/agent-governance/skills/core/decompose-tasks/SKILL.md` — task output for
each phase must state Type A (always) and the Type B decision (yes/no + reason).

`~/agent-governance/skills/core/verify-checkpoint/SKILL.md` — if a phase's
task output promised a Type B notebook, the checkpoint gate must confirm it
exists and runs top-to-bottom before the phase is marked passed.

`~/agent-governance/skills/core/write-plan/SKILL.md` — add one line pointing
to the rule now stated in full in `decompose-tasks`. Do not restate the rule
here; point to it.

---

## Files Claude Code Must Change

| # | File | Change type |
|---|---|---|
| 1 | `~/agent-governance/skills/core/decompose-tasks/SKILL.md` | Add phase-sizing rule; add Type A/B test-type fields per phase to task schema; add sizing + notebook-decision items to Checkpoint Coverage Audit |
| 2 | `~/agent-governance/skills/core/verify-checkpoint/SKILL.md` | Add gate: if Type B notebook was promised, confirm it exists and runs before phase passes |
| 3 | `~/agent-governance/skills/core/design-feature-notebook/SKILL.md` | Add lightweight checkpoint-mode notebook as a second mode within the existing skill |
| 4 | `~/agent-governance/skills/core/write-plan/SKILL.md` | Add one-line pointer to the test-type rule (no restatement) |
| 5 | `governance_pi_execution_planning_brief.md` | Mark superseded, archive per `deprecate-code` pattern, point to this brief |
| 6 | `~/agent-governance/SYSTEM_OVERVIEW.md` | Update §8 entries for `decompose-tasks`, `verify-checkpoint`, `design-feature-notebook`, `write-plan` to reflect the above; note the superseded brief in the changelog if one exists |

---

## What Claude Code Must NOT Do

- Do not create a new skill file (`plan-pi-execution` or otherwise) for this.
- Do not create a second notebook skill — checkpoint mode lives inside
  `design-feature-notebook`.
- Do not touch `AGENTS.execution.md` or Pi-facing behavior beyond confirming
  whether the "clarifying line" proposed in the superseded brief is still
  relevant — if it is, note it in the spec for human review; do not add it
  without approval.
- Do not restate the phase-sizing or test-type rule in more than one file.
  State it once in `decompose-tasks`; every other file points to it.

---

## Validation Criteria

1. `decompose-tasks/SKILL.md` states the phase-sizing rule once, in full, and
   the Checkpoint Coverage Audit checks for it.
2. Every phase in a task file produced under the new rule states Type A
   (always) and a Type B decision with a one-line reason.
3. `design-feature-notebook/SKILL.md` clearly distinguishes feature-mode
   (existing, full) from checkpoint-mode (new, lightweight) within one file.
4. `verify-checkpoint/SKILL.md` will not pass a phase that promised a
   Type B notebook but didn't produce one.
5. `governance_pi_execution_planning_brief.md` is archived with a clear
   superseded-by pointer, not left active alongside this brief.
6. No rule from this brief is stated in more than one skill file.
