# Tasks: Phase-Sized Checkpoints & Two Test Types

**ID:** 004 (spec: `docs/specs/004_phase_checkpoints_and_test_types.md`, plan: `docs/plans/004_phase_checkpoints_and_test_types.md`)

All tasks are documentation/skill-file edits. All executed directly by the
planning agent (Claude Code) in this session — no pi dispatch, since none
are `fast-code`/`local`-hinted work (matches the precedent set by
`docs/tasks/003_plan_pi_execution.md`).

## Phase 1 — Rule Definition and Skill Edits

**Goal:** Add the canonical phase-sizing rule and Type A/B test-type schema across the 5 affected skill files, with `plan-pi-execution` pointing to (not restating) the canonical rule.
**Entry condition:** Spec 004 confirmed, plan 004 written.
**Exit condition (checkpoint):** All grep checks in plan §11 pass; `AGENTS.md` diff empty.

### Dependency Analysis

| Task | Reads from | Writes to | Depends on |
|---|---|---|---|
| 1.1 | spec 004 | decompose-tasks/SKILL.md | none |
| 1.2 | decompose-tasks/SKILL.md (1.1 output) | plan-pi-execution/SKILL.md | 1.1 |
| 1.3 | decompose-tasks/SKILL.md (1.1 output) | verify-checkpoint/SKILL.md | 1.1 |
| 1.4 | decompose-tasks/SKILL.md (1.1 output) | design-feature-notebook/SKILL.md | 1.1 |
| 1.5 | decompose-tasks/SKILL.md (1.1 output) | write-plan/SKILL.md | 1.1 |
| 1.6 | all of the above | SYSTEM_OVERVIEW.md | 1.1, 1.2, 1.3, 1.4, 1.5 |

### Group 1-A — Sequential (single agent, no true concurrency needed)

### Task 1.1 — Add phase-sizing rule and Type A/B schema to decompose-tasks

**Phase:** 1
**Parallel group:** sequential
**Depends on:** none
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (skill doc)
**File(s):**

- `~/agent-governance/skills/core/decompose-tasks/SKILL.md` — modify
**What to build:** In §3 (Phase and group structure), add a new
subsection stating the phase-sizing rule in full: a phase is a sequence of
related tasks producing one demonstrable capability, with the boundary
test "once every task in this phase is done, what can the system now
demonstrably do that it couldn't before?" — small enough to execute
unsupervised, large enough that per-task checking would be wasteful. Note
that `plan-pi-execution`'s group boundary test is this same rule applied
to Pi-dispatched clusters nested within a phase — canonical definition
lives here, `plan-pi-execution` points to it. In §2 (task format), add
"Type A" (always applies, references write-tests) and "Type B" (yes/no +
one-line reason, references design-feature-notebook checkpoint mode) as
required fields on the Phase block (not the per-task block — Type A/B are
phase-level decisions). In §4 (Checkpoint coverage audit), add two items:
"Does every phase map to one stated capability, not a task count?" and
"Does every phase state a Type A/B decision with reason?"
**Verify:**

  ```
  grep -c "one demonstrable capability" ~/agent-governance/skills/core/decompose-tasks/SKILL.md
  grep -n "Does every phase map to one stated capability" ~/agent-governance/skills/core/decompose-tasks/SKILL.md
  grep -n "Type A\|Type B" ~/agent-governance/skills/core/decompose-tasks/SKILL.md
  ```

  Expected: count ≥1, both grep -n calls return matches.
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions (markdown)
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.2 — Replace plan-pi-execution's boundary-test restatement with a pointer

**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (skill doc)
**File(s):**

- `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` — modify
**What to build:** In "The Boundary Test (Rule 1)" section, replace the
full restatement ("A pi execution group is a cluster of atomic, pi-bound
tasks sized by **one demonstrable capability**... Boundary test — must be
answerable in one sentence: ...") with a pointer: the canonical
definition and boundary test now live in `decompose-tasks`'s phase-sizing
rule; a pi execution group applies that same test to the subset of a
phase's tasks that are Pi-dispatched. Keep the "If that sentence can't be
written, the boundary is wrong" guidance and its two bullets (merge/split)
— this is group-specific application advice, not a restatement of the
rule's definition, so it stays. Touch nothing else in the file: leave the
YAML frontmatter description, Scope-and-Boundary table, GROUP.md template,
Group Coverage Audit, Rule 2 (Mandatory Understanding Checkpoint), and
Related Skills exactly as they are.
**Verify:**

  ```
  grep -n "decompose-tasks" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
  git diff ~/agent-governance/skills/core/plan-pi-execution/SKILL.md | grep -c "^-"
  ```

  Expected: decompose-tasks referenced from the Boundary Test section; diff
  is small and confined to that one section (spot-check manually — no
  automated line-count gate, since the point is precision not size).
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.3 — Add Type A/B phase-level gate to verify-checkpoint

**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (skill doc)
**File(s):**

- `~/agent-governance/skills/core/verify-checkpoint/SKILL.md` — modify
**What to build:** In "Steps," add a step (or extend step 2) requiring
confirmation that Type A tests (always) pass, and — if the phase's task
file states Type B applies — that the promised notebook exists and runs
top-to-bottom before the phase is marked passed. For phases whose tasks
went through `plan-pi-execution` groups, this check is satisfied by
confirming the existing group-level `notebooks/understanding/<group_id>.ipynb`
and `tests/integration/test_<group_id>_integration.py` exist and pass,
rather than requiring a second, separate phase-level notebook. Add a
corresponding line to "Valid Checkpoint Items" (e.g., "Type B notebook for
this phase exists and runs top-to-bottom, per the task file's stated
decision").
**Verify:**

  ```
  grep -n "Type A\|Type B" ~/agent-governance/skills/core/verify-checkpoint/SKILL.md
  ```

  Expected: ≥2 matches.
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.4 — Add checkpoint mode to design-feature-notebook

**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (skill doc)
**File(s):**

- `~/agent-governance/skills/core/design-feature-notebook/SKILL.md` — modify
**What to build:** Rename the existing 10-section notebook description as
"Feature-Completion Mode" (existing behavior, unchanged) and add a new
"Checkpoint Mode (Per-Phase, Lightweight)" section: produced per-phase when
`decompose-tasks` states Type B applies; runs top-to-bottom sequentially,
no hidden state; breaks the phase's work into simple readable steps (not
one wrapper-function call — same forbidden pattern as feature mode); no
fixed section count or exhaustiveness requirement; visuals/plots
encouraged but not mandatory; paired with a Python-equivalent file when
the phase's output needs to be re-runnable by an agent later, following
the same pattern as feature mode's mandatory companion. State explicitly
that `plan-pi-execution`'s Rule 2 group-level understanding notebook uses
this checkpoint mode (not the full 10-section feature mode).
**Verify:**

  ```
  grep -n "Checkpoint Mode\|Feature-Completion Mode" ~/agent-governance/skills/core/design-feature-notebook/SKILL.md
  grep -n "plan-pi-execution" ~/agent-governance/skills/core/design-feature-notebook/SKILL.md
  ```

  Expected: both present.
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.5 — Add one-line pointer to write-plan

**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (skill doc)
**File(s):**

- `~/agent-governance/skills/core/write-plan/SKILL.md` — modify
**What to build:** Add one line (in "Rules" or "Related Skills") pointing
to the phase-sizing/Type A/B rule now stated in full in `decompose-tasks`.
No restatement of the rule itself.
**Verify:**

  ```
  grep -n "decompose-tasks" ~/agent-governance/skills/core/write-plan/SKILL.md
  ```

  Expected: pointer line present (in addition to the existing Related
  Skills reference).
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.6 — Update SYSTEM_OVERVIEW.md §8 entries

**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1, 1.2, 1.3, 1.4, 1.5
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (rule doc)
**File(s):**

- `~/agent-governance/SYSTEM_OVERVIEW.md` — modify
**What to build:** Update §8 entries for `decompose-tasks` (add phase-sizing
rule + Type A/B to Key gates), `verify-checkpoint` (add Type A/B phase
gate), `design-feature-notebook` (mention checkpoint mode alongside
existing 10-section mode), `write-plan` (mention the one-line pointer, no
new gate). Correct the `plan-pi-execution` entry's boundary-test wording
only if it now conflicts with the rule's canonical home in
`decompose-tasks` (targeted fix, not a full rewrite). Do not perform a
full disk-vs-doc skill inventory reconciliation. Bump "Last updated" date
to 2026-07-11.
**Verify:**

  ```
  grep -n "Type A\|Type B\|checkpoint mode\|Checkpoint Mode" ~/agent-governance/SYSTEM_OVERVIEW.md
  grep -n "Last updated:\*\* 2026-07-11" ~/agent-governance/SYSTEM_OVERVIEW.md
  ```

  Expected: both present.
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.final — verify-checkpoint

**What:** Run all Verify commands above plus `git diff ~/agent-governance/AGENTS.md` (expect empty) plus the full spec 004 Validation Plan.
**Model hint:** planning
**Rate limit flag:** no
**Human sign-off required:** NO (user authorized full completion without further stops)

---

## Checkpoint Coverage Audit

- [x] Every touched file has a task covering it.
- [x] Every spec Acceptance Criteria item maps to ≥1 task.
- [x] Phase ends with verify-checkpoint task.
- [x] No AGENT_EXECUTION_LOG FAILED patterns relevant to this work.
- [x] N/A: no interfaces.py/**init**.py touched.
- [x] Complexity budgets specified (all 0 — markdown only).
- [x] Does every phase map to one stated capability, not a task count? — Yes: "the governance system correctly distinguishes phase sizing from test-type verification, with Pi-group notebooks reusing the phase-level mechanism" is the one capability this phase produces.
- [x] Does every phase state a Type A/B decision with reason? — Type A: yes (skill-doc edits are still validated by grep/diff checks, the mechanical correctness check for this kind of work). Type B: no — this phase is a documentation/rule-definition change with no new or materially changed *code behavior* to demonstrate in a notebook; the artifacts produced are the rule definitions themselves, verified via the grep checks above.
