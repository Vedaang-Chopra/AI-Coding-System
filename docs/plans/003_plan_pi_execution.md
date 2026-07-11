# Plan: Pi Execution Grouping & Understanding Checkpoints
**ID:** 003 (spec: `docs/specs/003_plan_pi_execution.md`)

## 1. Summary

Adds two new rules to the governance system per spec 003: (1) a **pi
execution group** — a capability-sized planning unit sitting alongside
`decompose-tasks`' Phases/Parallel-Groups, formalizing what `<group>` in
`execute-tasks-with-pi`'s `docs/specs/pi_agent_tasks/<group>/` path means —
and (2) a **mandatory understanding checkpoint** (notebook + Python
integration test) per group, authored by the planning agent, never by pi.
This is pure documentation/skill-file work: one new skill file
(`plan-pi-execution`) and four targeted edits to existing governance
markdown. No production code, no schemas, no Python modules are created.

## 2. Layer Assignment

Not applicable in the 5-layer code sense — this plan produces governance
documentation and a skill definition, not application code.

| Component | Layer | File | Responsibility |
|---|---|---|---|
| N/A | N/A | — | This plan has no Layer 1–5 components; all outputs are markdown skill/rule files, not Python modules. |

## 3. Interface Design Decisions

N/A — no `interfaces.py`, `api.py`, or `__init__.py` touched. No public
Python symbols added or changed.

## 4. Error and Return Contracts

N/A — no new or modified public functions. All deliverables are markdown.

## 5. Files to Create

| Path | Layer | Purpose |
|---|---|---|
| `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` | N/A (skill doc) | Defines the group boundary test, `GROUP.md` template, Group Coverage Audit, and understanding-checkpoint authorship rule (Rules 1 & 2 from the brief). |

## 6. Files to Modify

| Path | What changes | Layer | Impact on callers |
|---|---|---|---|
| `~/agent-governance/AGENTS.planning.md` | Add Step 4b — Pi Execution Grouping (between Step 4 and Step 5); add row to Conditional Skill Reads table; add line to Planning Self-Check. | N/A (rule doc) | Read by Claude Code / Codex during planning sessions — next planning session picks up the new step automatically. |
| `~/agent-governance/SYSTEM_OVERVIEW.md` | §5 workflow diagram: insert grouping + understanding-checkpoint gate between `decompose-tasks` and `[Pi receives execution prompt:]`. §8: add `plan-pi-execution` entry; update skill count (24→25) everywhere referenced. §10: add two forbidden patterns. Bump "Last updated" date. | N/A (rule doc) | Any AI chatbot briefed with this file gets the corrected workflow and skill count. |
| `~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md` | Scope-and-Boundary table references `plan-pi-execution`. Setup section clarifies `<group>` = `plan-pi-execution`'s `group_id`. Add `plan-pi-execution` to Related Skills. | N/A (skill doc) | Existing dispatch/verification mechanics (Mode A/B, JSON log schema, wrapper scripts) untouched — only group-name sourcing clarified. |
| `~/agent-governance/AGENTS.execution.md` | One new line under "Notebook + Python Equivalent Rule" telling Pi it does not author group-level understanding notebooks unless its own task explicitly asks for one. | N/A (rule doc) | Read by Pi / GPT-5.4-mini — clarifies a boundary that was previously unstated. |

**Explicitly not modified:** `~/agent-governance/AGENTS.md` (universal file) —
confirmed by `git diff` remaining empty for this file after implementation.

## 7. Dependency Order

Documentation-only change; no schemas/core/orchestration/interface layering
applies. Implementation order, to keep cross-references valid as they're
written:

1. `plan-pi-execution/SKILL.md` (new skill — defines the vocabulary
   `group_id`, `GROUP.md`, Group Coverage Audit — that the other four edits
   reference).
2. `execute-tasks-with-pi/SKILL.md` (references `plan-pi-execution`, which
   must exist first for the cross-reference to be accurate).
3. `AGENTS.planning.md` (Step 4b referencing `plan-pi-execution`).
4. `AGENTS.execution.md` (one-line clarification, no dependency on the others).
5. `SYSTEM_OVERVIEW.md` (last, since it summarizes/counts all core skills —
   written last so the count and diagram reflect the final state).

## 8. Task Complexity Budgets

| Task | Expected new functions | Max call depth | Interface form constraint |
|---|---|---|---|
| Create `plan-pi-execution/SKILL.md` | 0 (markdown only) | N/A | N/A |
| Edit `execute-tasks-with-pi/SKILL.md` | 0 (markdown only) | N/A | N/A |
| Edit `AGENTS.planning.md` | 0 (markdown only) | N/A | N/A |
| Edit `AGENTS.execution.md` | 0 (markdown only) | N/A | N/A |
| Edit `SYSTEM_OVERVIEW.md` | 0 (markdown only) | N/A | N/A |

All five tasks are `planning`-hinted (Claude Code direct edit) — none are
`fast-code`/`local`, so `execute-tasks-with-pi` dispatch does not apply to
this plan's own execution. Ironic but correct: this plan is about how future
*other* projects group pi-bound work, not itself a pi-bound task.

## 9. Integration Points

- `plan-pi-execution` becomes a new dependency of `AGENTS.planning.md`'s
  Planning Phase Protocol (Step 4b) and of `execute-tasks-with-pi` (source
  of `group_id`).
- Any project currently mid-flight using the old informal `<group>` naming
  (e.g. CAD Design's `2026-07-09_visual_analysis`) is unaffected — retrofitting
  is explicitly out of scope (spec §Out of Scope). Those directories keep
  working as-is; only future groups adopt `GROUP.md`.
- `verify-checkpoint` and `design-feature-notebook` are referenced, not
  modified — if either's contract changes later, `plan-pi-execution` would
  need a follow-up edit.
- Breaks if wrong: if `plan-pi-execution/SKILL.md` doesn't exist before
  `execute-tasks-with-pi/SKILL.md` is edited to reference it, the
  cross-reference is dangling — dependency order in §7 exists to prevent this.

## 10. Risks and Open Questions

- **Risk:** `group_id` naming convention is a judgment call (spec's Known
  Risks section). Resolved here: kebab-case capability name, optional
  `YYYY-MM-DD_` date prefix — matches the existing informal convention
  observed on disk (CAD Design's `2026-07-09_visual_analysis`), so no
  existing tooling path defaults (`run_pi_task.py`, `query_pi_log.py`) need
  to change.
- **Risk:** Skill count in `SYSTEM_OVERVIEW.md` is referenced in the Quick
  Navigation heading (`§8 Core Skills (24)`) and in §2's table (`Core skills
  (24)`) — both must be updated in the same edit or the count goes stale
  again immediately.
- No open questions — spec confirmed with none outstanding.

## 11. Validation Criteria

- `test -f ~/agent-governance/skills/core/plan-pi-execution/SKILL.md`
- `grep -n "group_id\|GROUP.md\|Group Coverage Audit" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md`
- `grep -n "Step 4b" ~/agent-governance/AGENTS.planning.md`
- `grep -n "plan-pi-execution" ~/agent-governance/AGENTS.planning.md ~/agent-governance/SYSTEM_OVERVIEW.md ~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md`
- `grep -n "understanding notebook" ~/agent-governance/AGENTS.execution.md`
- `grep -c "Core Skills (25)\|Core skills (25)" ~/agent-governance/SYSTEM_OVERVIEW.md` → expect ≥1 (both Quick Nav heading and §2 table updated)
- `git diff ~/agent-governance/AGENTS.md` → expect empty output (universal file untouched)
- Manual read-through confirming: understanding checkpoint never described
  as replacing `verify-checkpoint`, and vice versa.
