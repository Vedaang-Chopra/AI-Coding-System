# Tasks: Pi Execution Grouping & Understanding Checkpoints
**ID:** 003 (spec: `docs/specs/003_plan_pi_execution.md`, plan: `docs/plans/003_plan_pi_execution.md`)

All tasks are documentation/skill-file edits. All executed directly by the
planning agent (Claude Code) in this session — no pi dispatch, since none
are `fast-code`/`local`-hinted work.

## Phase 1 — Governance Edits
**Goal:** Add the pi execution group + understanding checkpoint rules across the 5 affected files.
**Entry condition:** Spec 003 confirmed, plan 003 confirmed.
**Exit condition (checkpoint):** All grep/test checks in plan §11 pass; `AGENTS.md` diff empty.

### Dependency Analysis
| Task | Reads from | Writes to | Depends on |
|---|---|---|---|
| 1.1 | brief, execute-tasks-with-pi/SKILL.md | plan-pi-execution/SKILL.md | none |
| 1.2 | plan-pi-execution/SKILL.md | execute-tasks-with-pi/SKILL.md | 1.1 |
| 1.3 | plan-pi-execution/SKILL.md | AGENTS.planning.md | 1.1 |
| 1.4 | AGENTS.execution.md (existing rule) | AGENTS.execution.md | none |
| 1.5 | all of the above | SYSTEM_OVERVIEW.md | 1.1, 1.2, 1.3, 1.4 |

### Group 1-A — Sequential (single agent, no true concurrency needed)

### Task 1.1 — Create plan-pi-execution skill
**Phase:** 1
**Parallel group:** sequential
**Depends on:** none
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (skill doc)
**File(s):**
  - `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` — create
**What to build:** New skill defining: the one-sentence capability boundary
test; the `GROUP.md` template (Capability, Tasks, Depends on groups,
Correctness checkpoint, Understanding checkpoint status); the Group
Coverage Audit (4 checks from brief); the mandatory Rule 2 understanding
checkpoint (notebook + Python integration test) with authorship explicitly
Claude Code, never pi; the skip condition (`exempt` groups); the gate
strength note (production gate, not automatic human-approval layer, unless
stated per-group). Model Scope-and-Boundary table and overall structure on
`execute-tasks-with-pi/SKILL.md`.
**Verify:**
  ```
  test -f ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
  grep -c "group_id" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
  grep -c "GROUP.md" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
  grep -c "Group Coverage Audit" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
  grep -c "never.*pi\|not.*pi\|Claude Code" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
  ```
  Expected: file exists, all grep counts ≥1.
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions (markdown)
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.2 — Update execute-tasks-with-pi cross-references
**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (skill doc)
**File(s):**
  - `~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md` — modify
**What to build:** Add `plan-pi-execution` row to Scope-and-Boundary table.
In Setup section, state `<group>` is `plan-pi-execution`'s `group_id`, not
an ad hoc label. Add `plan-pi-execution` to Related Skills list. No changes
to dispatch/verification mechanics.
**Verify:**
  ```
  grep -n "plan-pi-execution" ~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md
  ```
  Expected: ≥3 matches (Scope-and-Boundary, Setup, Related Skills).
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.3 — Add Step 4b to AGENTS.planning.md
**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (rule doc)
**File(s):**
  - `~/agent-governance/AGENTS.planning.md` — modify
**What to build:** Insert "Step 4b — Pi Execution Grouping" between Step 4
and Step 5 in the Planning Phase Protocol, gated on "any task hinted
fast-code/local", with explicit completion criteria (Group Coverage Audit
passes) before Step 5 proceeds. Add row to Conditional Skill Reads During
Planning table pointing to `plan-pi-execution`. Add line to Planning
Self-Check.
**Verify:**
  ```
  grep -n "Step 4b" ~/agent-governance/AGENTS.planning.md
  grep -n "plan-pi-execution" ~/agent-governance/AGENTS.planning.md
  ```
  Expected: Step 4b present, ≥2 references to plan-pi-execution (protocol step + skill-reads table).
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.4 — Clarify AGENTS.execution.md notebook authorship
**Phase:** 1
**Parallel group:** sequential
**Depends on:** none
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (rule doc)
**File(s):**
  - `~/agent-governance/AGENTS.execution.md` — modify
**What to build:** One clarifying line under existing "Notebook + Python
Equivalent Rule": group-level understanding notebooks are authored by the
planning agent, not by Pi — if Pi's task doesn't explicitly ask for a
notebook, Pi does not create one.
**Verify:**
  ```
  grep -n "understanding notebook\|group-level" ~/agent-governance/AGENTS.execution.md
  ```
  Expected: ≥1 match.
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.5 — Update SYSTEM_OVERVIEW.md
**Phase:** 1
**Parallel group:** sequential
**Depends on:** 1.1, 1.2, 1.3, 1.4
**Model hint:** planning
**Rate limit flag:** no
**Fallback model:** planning
**Layer:** N/A (rule doc)
**File(s):**
  - `~/agent-governance/SYSTEM_OVERVIEW.md` — modify
**What to build:** §5 workflow diagram: insert grouping + understanding
checkpoint step between `decompose-tasks` and `[Pi receives execution
prompt:]`. §8: add `plan-pi-execution` entry (What/Invoke/Produces/Key
gates format); update skill count 24→25 everywhere referenced (Quick Nav
heading, §2 table). §10: add two forbidden patterns (dispatching a group's
understanding notebook to pi; marking a group `[done]` without both
checkpoint files or exemption). Bump "Last updated" date to 2026-07-10.
**Verify:**
  ```
  grep -n "plan-pi-execution" ~/agent-governance/SYSTEM_OVERVIEW.md
  grep -n "Core Skills (25)\|Core skills (25)" ~/agent-governance/SYSTEM_OVERVIEW.md
  grep -n "Last updated:\*\* 2026-07-10" ~/agent-governance/SYSTEM_OVERVIEW.md
  ```
  Expected: all present.
**Checkpoint:** Phase 1 final checkpoint
**AGENT_EXECUTION_LOG notes:** none
**Complexity budget:** 0 new functions
**Max call depth:** N/A
**Interface form constraint:** N/A
**Error contract:** N/A
**Notebook equivalent:** No

### Task 1.final — verify-checkpoint
**What:** Run all Verify commands above plus `git diff ~/agent-governance/AGENTS.md` (expect empty).
**Model hint:** planning
**Rate limit flag:** no
**Human sign-off required:** NO (user authorized full completion without further stops)

---

## Checkpoint Coverage Audit

- [x] Every touched file has a task covering it.
- [x] Every spec Acceptance Criteria item maps to ≥1 task.
- [x] Phase ends with verify-checkpoint task.
- [x] No AGENT_EXECUTION_LOG FAILED patterns relevant to this work.
- [x] N/A: no interfaces.py/__init__.py touched.
- [x] Complexity budgets specified (all 0 — markdown only).
