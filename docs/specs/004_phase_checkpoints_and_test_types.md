# Spec: Phase-Sized Checkpoints & Two Test Types
**ID:** 004
**Status:** Implemented
**Source brief:** `docs/tasks/governance_brief_phase_checkpoints_and_test_types.md`

## Purpose

`decompose-tasks` requires every phase to end with a `verify-checkpoint`
task, but never defines what makes a phase valid — nothing stops a phase
from being one task or twenty unrelated ones. Separately, plans currently
account for only one kind of verification: pytest-style correctness checks
for the agent (Type A). There is no defined mechanism for a
human-readable checkpoint — something a human can open and read to
understand what was built in a phase, without reading a diff (Type B).

This spec closes both gaps by:
1. Adding an explicit phase-sizing rule to `decompose-tasks` — the
   canonical, single statement of "a phase is a sequence of related tasks
   producing one demonstrable capability" — with a one-sentence boundary
   test: *"once every task in this phase is done, what can the system now
   demonstrably do that it couldn't before?"*
2. Naming the existing pytest-style test as "Type A" (no behavior change)
   and introducing "Type B" — a lightweight, per-phase understanding
   notebook, produced only when a phase generates new or materially
   changed code. Type B is added as a second mode within the existing
   `design-feature-notebook` skill (checkpoint mode), sitting alongside the
   existing full 10-section feature-completion mode — not a new skill file.

This is a planning-layer change. It changes how Claude Code writes plans
and task lists. It does not change execution-agent (Pi) behavior.

## Resolution Log (both Open Questions from the prior draft, resolved 2026-07-11)

**1. The named prior brief (`governance_pi_execution_planning_brief.md`)
does not exist on disk; the work it describes already shipped as
`plan-pi-execution/SKILL.md`, checkpoint-passed 2026-07-10.** Resolution:
the archive instruction is moot and dropped entirely. This spec does not
touch `execute-tasks-with-pi/SKILL.md`, `AGENTS.planning.md` Step 4b, or
the group-notebook authorship line in `AGENTS.execution.md`. It makes
exactly one narrow, deduplication-only edit to
`plan-pi-execution/SKILL.md` (below) — nothing else in that file changes.

**2. Relationship between "Phase" and "pi execution group."** Resolution:
Phase (`decompose-tasks`) is the general container. A pi execution group
(`plan-pi-execution`) is a Pi-specific refinement nested inside a phase.
Both are sized by the same "one demonstrable capability" boundary test
because they are the same idea applied at two scopes — phase-level for all
tasks, group-level for the subset of a phase's tasks that are
Pi-dispatched. `decompose-tasks` becomes the single canonical statement of
this test; `plan-pi-execution` points to it rather than restating it.

## Affected Modules

- `~/agent-governance/skills/core/decompose-tasks/SKILL.md` — add the
  phase-sizing rule (canonical, single statement, including the boundary
  test above); add Type A/B fields to the task/phase schema; add two items
  to the Checkpoint Coverage Audit; note that `plan-pi-execution`'s group
  boundary test is this same rule applied to Pi-dispatched clusters
  nested within a phase.
- `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` — **one
  edit only:** replace the "Boundary Test (Rule 1)" section's independent
  restatement of the one-demonstrable-capability test with a pointer to
  its canonical definition in `decompose-tasks`. No other section, table,
  or the YAML frontmatter description changes.
- `~/agent-governance/skills/core/verify-checkpoint/SKILL.md` — add the
  Type A / Type B check at the Phase level, for every phase. For a phase
  whose tasks went through pi execution groups, Type B is satisfied by the
  existing group-level understanding-checkpoint files
  (`notebooks/understanding/<group_id>.ipynb` +
  `tests/integration/test_<group_id>_integration.py`) — the gate confirms
  those exist rather than requiring a second, redundant phase-level
  notebook.
- `~/agent-governance/skills/core/design-feature-notebook/SKILL.md` — add
  checkpoint mode (lightweight, per-phase, no fixed section count) as a
  second mode alongside the existing feature-completion mode (full,
  10-section). State explicitly that this mode is what
  `plan-pi-execution`'s Rule 2 group-level understanding notebook refers
  to, giving `plan-pi-execution` a correct target even though its own body
  text is not being edited to match (see Known Risks).
- `~/agent-governance/skills/core/write-plan/SKILL.md` — unchanged from
  prior draft: one line pointing to the phase-sizing/test-type rule in
  `decompose-tasks`. No restatement.
- `~/agent-governance/SYSTEM_OVERVIEW.md` — update §8 entries for
  `decompose-tasks`, `verify-checkpoint`, `design-feature-notebook`, and
  `write-plan` per the above. Add or correct the `plan-pi-execution` §8
  entry only if it is missing or describes the boundary test in a way that
  now conflicts with its canonical home in `decompose-tasks` — a targeted
  fix, not a full pass. **Explicitly not doing:** a full disk-vs-doc
  skill-count reconciliation — that is `docs/tasks/governance_brief_skill_audit.md`'s
  job (its own step 2), and duplicating it here is out of scope.

**Explicitly NOT touched by this spec:**
- `~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md`
- `~/agent-governance/AGENTS.planning.md` Step 4b
- `~/agent-governance/AGENTS.execution.md` notebook-authorship line
- `docs/specs/003_plan_pi_execution.md`, `docs/plans/003_plan_pi_execution.md`,
  `docs/tasks/003_plan_pi_execution.md`
- Any section of `plan-pi-execution/SKILL.md` other than the Boundary Test
  (Rule 1) restatement named above.

## Out of Scope

- Creating a new skill file for phase sizing or test types — both live
  inside existing skills (`decompose-tasks`, `design-feature-notebook`).
- Creating a second notebook skill file — checkpoint mode is a mode within
  `design-feature-notebook`, not a sibling file.
- Any change to `AGENTS.execution.md` or Pi-facing behavior.
- Archiving or restructuring `plan-pi-execution/SKILL.md` beyond the one
  named edit; archiving or modifying `execute-tasks-with-pi`,
  `AGENTS.planning.md`, or the 003 spec/plan/tasks artifacts.
- A full disk-vs-doc skill inventory reconciliation in `SYSTEM_OVERVIEW.md`
  — reserved for `governance_brief_skill_audit.md`.
- Restating the phase-sizing or test-type rule in more than one file —
  stated once in `decompose-tasks`, every other file points to it.

## Acceptance Criteria

1. `decompose-tasks/SKILL.md` states the phase-sizing rule (including the
   boundary-test sentence) exactly once, in full, and the Checkpoint
   Coverage Audit includes an item checking for it ("Does every phase map
   to one stated capability, not a task count?").
2. `decompose-tasks/SKILL.md`'s per-phase/task schema requires stating
   Type A (always applies) and a Type B decision (yes/no + one-line
   reason) for every phase.
3. `plan-pi-execution/SKILL.md`'s Boundary Test (Rule 1) section no longer
   independently restates the one-demonstrable-capability test in full —
   it points to `decompose-tasks` instead. No other part of the file
   differs from its current, already-shipped state.
4. `design-feature-notebook/SKILL.md` contains two clearly distinguished
   modes in one file: feature-completion mode (existing, unchanged, full
   10 sections) and checkpoint mode (new, lightweight, sequential, no
   fixed section count, produced per-phase when Type B applies), with an
   explicit statement that `plan-pi-execution`'s group-level notebooks use
   checkpoint mode.
5. `verify-checkpoint/SKILL.md` includes a phase-level gate for Type A
   (always) and Type B (when promised). For phases with pi execution
   groups, the gate checks the existing group-level checkpoint files
   rather than requiring a separate phase-level notebook.
6. `write-plan/SKILL.md` contains exactly one line pointing to the
   phase-sizing/test-type rule in `decompose-tasks` — no restatement.
7. No rule introduced by this spec is stated in full in more than one
   skill file (the sole intentional exception being the one pointer
   sentence each in `plan-pi-execution` and `write-plan`, which are
   pointers, not restatements).
8. `SYSTEM_OVERVIEW.md` §8 entries for `decompose-tasks`,
   `verify-checkpoint`, `design-feature-notebook`, and `write-plan`
   accurately reflect the above. The `plan-pi-execution` entry is
   corrected only if currently stale relative to the canonical rule's new
   home; no broader disk-vs-doc audit is performed.

## Validation Plan

```bash
# 1. Phase-sizing rule stated once, audit item present
grep -c "one demonstrable capability" ~/agent-governance/skills/core/decompose-tasks/SKILL.md
grep -n "Does every phase map to one stated capability" ~/agent-governance/skills/core/decompose-tasks/SKILL.md

# 2. Type A / Type B fields in task schema
grep -n "Type A\|Type B" ~/agent-governance/skills/core/decompose-tasks/SKILL.md

# 3. plan-pi-execution points to decompose-tasks instead of restating
grep -n "decompose-tasks" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
# Expected: Boundary Test section references decompose-tasks; full "must be
# answerable in one sentence" restatement no longer present verbatim there.

# 4. Checkpoint mode present in design-feature-notebook, distinct from feature mode
grep -n "Checkpoint mode\|Feature-completion mode" ~/agent-governance/skills/core/design-feature-notebook/SKILL.md
grep -n "plan-pi-execution" ~/agent-governance/skills/core/design-feature-notebook/SKILL.md

# 5. verify-checkpoint gates on Type A/B at phase level, defers to group files when present
grep -n "Type A\|Type B" ~/agent-governance/skills/core/verify-checkpoint/SKILL.md

# 6. write-plan points to the rule, does not restate it in full
grep -n "decompose-tasks" ~/agent-governance/skills/core/write-plan/SKILL.md

# 7. No duplicate FULL statement of the sizing rule across files
grep -rl "one demonstrable capability" ~/agent-governance/skills/core/
# Expected: decompose-tasks/SKILL.md (canonical) — plan-pi-execution may
# still contain the phrase in a pointer sentence or its unedited YAML
# description; confirm by reading, not just grep count.

# 8. SYSTEM_OVERVIEW reflects the four updated skills
grep -n "Type A\|Type B\|checkpoint mode" ~/agent-governance/SYSTEM_OVERVIEW.md
```

## Known Risks / Limitations

- **Residual staleness in `plan-pi-execution/SKILL.md`'s Rule 2 text.**
  Per explicit scope instruction, only the Boundary Test (Rule 1) section
  is edited. Rule 2 ("Mandatory Understanding Checkpoint Per Group") still
  says group notebooks follow "design-feature-notebook's existing
  10-section structure ... scoped to the group's capability" — after this
  spec, the correct target is checkpoint mode (no fixed section count),
  not the full 10-section structure. This is an accepted, intentional
  inconsistency for this pass: `design-feature-notebook` states the
  correct pointer on its own side, and `plan-pi-execution`'s wording is
  left untouched per instruction. A future pass (or the skill-audit brief)
  may want to close this gap explicitly.
- The one-line reason required for a "no Type B" decision is not
  mechanically checkable beyond presence/absence — `verify-checkpoint` can
  confirm a reason string exists, not that it is a good reason. This
  mirrors the existing limitation on subjective checkpoint items and is
  accepted as-is, consistent with `verify-checkpoint`'s existing
  binary/mechanical-only standard.
- The YAML frontmatter `description` of `plan-pi-execution/SKILL.md`
  (used for skill discovery/triggering) also references
  "sized by one demonstrable capability" — left unchanged, since it's a
  discovery aid, not a rule restatement, and the instruction scoped the
  edit to the Boundary Test section only.

## Open Questions

None outstanding. Both questions from the prior draft are resolved — see
Resolution Log above.
