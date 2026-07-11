# Plan: Phase-Sized Checkpoints & Two Test Types

## 1. Summary

Implements spec 004: adds a canonical phase-sizing rule to `decompose-tasks`
(one demonstrable capability, one-sentence boundary test), names the
existing pytest-style check as "Type A" and introduces "Type B" — a
lightweight per-phase understanding notebook via a new checkpoint mode in
`design-feature-notebook`. `verify-checkpoint` gates on both at the phase
level, deferring to existing group-level files when a phase's tasks went
through `plan-pi-execution`. `plan-pi-execution` gets exactly one edit
(its boundary-test restatement replaced by a pointer to the new canonical
home). `write-plan` gets a one-line pointer. `SYSTEM_OVERVIEW.md` §8
entries are updated to match. All work is documentation/skill-file editing
— no production code, no notebooks produced by this plan itself (the
Type B notebook mechanism is defined, not exercised, by this change).

## 2. Layer Assignment

N/A — every file touched is a governance rule doc or skill doc (Layer
N/A per this repo's own convention, matching plan 003).

| Component | Layer | File | Responsibility |
|---|---|---|---|
| Phase-sizing rule + Type A/B schema | N/A (skill doc) | `decompose-tasks/SKILL.md` | Canonical rule + task schema fields |
| Boundary-test pointer | N/A (skill doc) | `plan-pi-execution/SKILL.md` | Points to canonical rule, no restatement |
| Phase-level Type A/B gate | N/A (skill doc) | `verify-checkpoint/SKILL.md` | Checkpoint gate logic |
| Checkpoint-mode notebook | N/A (skill doc) | `design-feature-notebook/SKILL.md` | New lightweight notebook mode |
| Pointer to rule | N/A (skill doc) | `write-plan/SKILL.md` | One-line cross-reference |
| Skill summary sync | N/A (rule doc) | `SYSTEM_OVERVIEW.md` | §8 entries reflect above |

## 3. Interface Design Decisions

N/A — no `interfaces.py`, `api.py`, or `__init__.py` touched.

## 4. Error and Return Contracts

N/A — no functions added or modified.

## 5. Files to Create

None. All work modifies existing files.

## 6. Files to Modify

| Path | What changes | Layer | Impact on callers |
|---|---|---|---|
| `~/agent-governance/skills/core/decompose-tasks/SKILL.md` | Add phase-sizing rule (§3, new subsection) with boundary-test sentence; add Type A/Type B fields to the Phase block template (§3) and note in §2 task format; add 2 Checkpoint Coverage Audit items (§4) | N/A | Any future plan/task-file author (Claude Code, Codex) sees new required fields |
| `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` | Replace "The Boundary Test (Rule 1)" section body with a pointer to `decompose-tasks`'s canonical rule; keep section heading, keep "If that sentence can't be written..." guidance (it's group-specific application, not a restatement of the definition itself) | N/A | None — group_id semantics unchanged, only removes duplicated rule text |
| `~/agent-governance/skills/core/verify-checkpoint/SKILL.md` | Add Type A/Type B gate to Steps (§Steps) and Valid Checkpoint Items (§); phase with pi-execution-group tasks checks existing group files instead of demanding a second notebook | N/A | verify-checkpoint runs now check for Type B artifact when promised |
| `~/agent-governance/skills/core/design-feature-notebook/SKILL.md` | Add new "## Checkpoint Mode (Per-Phase, Lightweight)" section distinguishing it from existing "Feature-Completion Mode"; state explicitly it is what `plan-pi-execution`'s group-level notebooks use | N/A | Notebook authors (Claude Code) have a second, lighter template |
| `~/agent-governance/skills/core/write-plan/SKILL.md` | Add one line in §Rules or Related Skills pointing to the phase-sizing/test-type rule in `decompose-tasks` | N/A | None — pure cross-reference |
| `~/agent-governance/SYSTEM_OVERVIEW.md` | Update §8 entries for `decompose-tasks`, `verify-checkpoint`, `design-feature-notebook`, `write-plan`; correct `plan-pi-execution` entry only if stale relative to new canonical home; bump "Last updated" date | N/A | Any AI reader briefed by this file sees accurate skill gates |

## 7. Dependency Order

1. `decompose-tasks/SKILL.md` — establishes the canonical rule everything else points to.
2. `plan-pi-execution/SKILL.md` — depends on (1) existing, to point to it.
3. `verify-checkpoint/SKILL.md` — depends on (1) for what "Type A/B" means.
4. `design-feature-notebook/SKILL.md` — depends on (1) for phase-scoping language; independent of (2)/(3).
5. `write-plan/SKILL.md` — depends on (1) only, for the pointer target.
6. `SYSTEM_OVERVIEW.md` — depends on (1)–(5) all being final, since it summarizes them.

## 8. Task Complexity Budgets

| Task | Expected new functions | Max call depth | Interface form constraint |
|---|---|---|---|
| All tasks | 0 (markdown only) | N/A | N/A |

## 9. Integration Points

- `decompose-tasks` is read by every future planning session producing a
  task file — this is the highest-traffic file in this plan.
- `plan-pi-execution` is read whenever any task is hinted
  `fast-code`/`local` (per `AGENTS.planning.md` Step 4b) — the edit here
  must not change when or how that trigger fires, only what it points to
  for the boundary-test definition.
- `verify-checkpoint` is read at every phase checkpoint — the new gate
  must not block existing checkpoints that predate this change (i.e., it
  only fires when a task file explicitly states a Type A/B decision;
  absence of that field on old task files is not itself a failure, since
  those files were written under the old schema).
- `SYSTEM_OVERVIEW.md` is the AI-reader briefing doc — must stay accurate
  or every future session gets misled.

## 10. Risks and Open Questions

None open — spec 004's two open questions were resolved by the human
before this plan was written (see spec's Resolution Log). One accepted,
documented risk carries forward unchanged from the spec: `plan-pi-execution`
Rule 2 will still describe group notebooks as following the "existing
10-section structure ... scoped down" after this plan, which becomes
imprecise once checkpoint mode exists — left as-is per explicit scope
instruction, not fixed by this plan.

## 11. Validation Criteria

Same as spec 004's Validation Plan — reproduced here as the executable
checkpoint for this plan's tasks:

```bash
grep -c "one demonstrable capability" ~/agent-governance/skills/core/decompose-tasks/SKILL.md
grep -n "Does every phase map to one stated capability" ~/agent-governance/skills/core/decompose-tasks/SKILL.md
grep -n "Type A\|Type B" ~/agent-governance/skills/core/decompose-tasks/SKILL.md
grep -n "decompose-tasks" ~/agent-governance/skills/core/plan-pi-execution/SKILL.md
grep -n "Checkpoint mode\|Feature-completion mode\|Checkpoint Mode\|Feature-Completion Mode" ~/agent-governance/skills/core/design-feature-notebook/SKILL.md
grep -n "plan-pi-execution" ~/agent-governance/skills/core/design-feature-notebook/SKILL.md
grep -n "Type A\|Type B" ~/agent-governance/skills/core/verify-checkpoint/SKILL.md
grep -n "decompose-tasks" ~/agent-governance/skills/core/write-plan/SKILL.md
grep -rl "one demonstrable capability" ~/agent-governance/skills/core/
grep -n "Type A\|Type B\|checkpoint mode\|Checkpoint Mode" ~/agent-governance/SYSTEM_OVERVIEW.md
git diff --stat ~/agent-governance/AGENTS.md   # expect empty — not in scope
```
