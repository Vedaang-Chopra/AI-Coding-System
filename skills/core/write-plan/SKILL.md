---
name: write-plan
description: >
  Use after write-spec is confirmed and before decompose-tasks. Required for any
  substantial feature. Converts a spec's WHAT into a technical HOW — architecture
  decisions, layer assignments, file inventory, and dependency order. Never begin
  implementation without a confirmed plan. Triggers: "plan this feature", "how
  should we build X", "technical design for", or any time a spec exists but no
  plan document does.
---

# SKILL: write-plan

## Trigger

Use this skill when:
* A spec exists at `docs/specs/` but no corresponding plan exists at `docs/plans/`.
* Starting implementation of any feature that touches more than one file.
* A human asks "how should we build this" after a spec has been written.

Do NOT begin `decompose-tasks` or any implementation until this plan is confirmed.

---

## Purpose

A spec answers: what to build, why, and what done looks like.
A plan answers: which files, which layers, what order, what dependencies.

Without a plan, coding agents invent structure. That produces misplaced logic,
duplicate code, and wrong module ownership — all of which are hard to fix later.

---

## Output Location

`docs/plans/<NNN>_<feature_name>.md`

Use the same `NNN` number as the corresponding spec.

---

## Fixed Plan Structure (Mandatory — All 11 Sections Required)

Every plan produced by this skill must contain exactly these sections, in this order.

### Section 1 — Summary
One paragraph. What this plan builds and why. Reference spec number.

### Section 2 — Layer Assignment
Table for every component involved:

| Component | Layer | File | Responsibility |
|---|---|---|---|

Every component maps to exactly one layer. If two components want the same file but different layers — design error, split the file.

### Section 3 — Interface Design Decisions (REQUIRED when any task touches interfaces.py, api.py, or __init__.py)

For every symbol being added to or changed in the public surface, specify:

| Symbol | Form | Expression | Reason |
|---|---|---|---|
| `public_name` | Re-export | `from .module import func as public_name` | No transformation needed |
| `public_name` | Wrapper | `def public_name(x: T) -> R: ...` | Adds validation: ... |
| `public_name` | Alias | `public_name = existing_name` | Backward compat for: ... |

**Rules:**
- Re-export is the default. Use it whenever the underlying function's signature matches what callers need.
- Wrapper is only used when the plan explicitly requires transformation, validation, or composition.
- Alias requires a stated reason. No silent aliases.
- If this section is left empty when the task touches interfaces.py — the plan is incomplete.

### Section 4 — Error and Return Contracts (REQUIRED for every new or modified public function)

| Function | Success return | Missing/invalid input | Failure case | Raises |
|---|---|---|---|---|
| `func_name(x)` | `Result` object | Returns `None` | Raises `DomainError` | `DomainError`, `ValueError` |

All functions in the same module must use consistent contracts. If one function returns `list[str]` for errors and another returns `tuple[bool, str]` — this is a design error, resolve it before the plan is approved.

### Section 5 — Files to Create
| Path | Layer | Purpose |
|---|---|---|

### Section 6 — Files to Modify
| Path | What changes | Layer | Impact on callers |
|---|---|---|---|

### Section 7 — Dependency Order
Ordered implementation sequence. Always: schemas → core → orchestration → interface → tests → notebooks/integration tests.

### Section 8 — Task Complexity Budgets (REQUIRED — specified per task before decomposition)

| Task | Expected new functions | Max call depth | Interface form constraint |
|---|---|---|---|
| Implement core logic | 3 | 3 | N/A |
| Add to interfaces.py | 0 new functions | N/A | Re-export only |

These budgets are copied into the task file as hard constraints for Pi.

### Section 9 — Integration Points
Where this feature touches existing modules. What breaks if this plan is wrong.

### Section 10 — Risks and Open Questions
All open questions must be resolved before plan is approved. If unresolvable — Status stays Draft.

### Section 11 — Validation Criteria
What "done" looks like. Specific runnable commands for each major acceptance criterion.

---

## Rules

1. Never write a plan without reading the corresponding spec first.
2. If the plan reveals the spec is ambiguous, fix the spec before finishing the plan.
3. The plan must be confirmed by the human before `decompose-tasks` runs.
4. Every file in "Files to Create" must have a stated layer and purpose.
5. Every component in "Layer Assignment" must map to exactly one layer.
6. If two components want to be in the same file with different layers, that is
   a design error — split the file or reconsider the boundaries.
7. If implementation diverges from the plan, update the plan to reflect reality.
   The plan is a living document, not a historical artifact.

---

## Checklist Before Confirming

- [ ] All 11 Fixed Plan Structure sections are present.
- [ ] Interface Design Decisions completed for every public symbol being added or changed.
- [ ] Error and Return Contracts specified for every new or modified public function.
- [ ] Task Complexity Budgets specified for every task.
- [ ] Every new file has a stated layer and owner.
- [ ] No logic is placed in notebooks.
- [ ] No algorithms are placed in runners.py.
- [ ] No schemas are duplicated from an existing location.
- [ ] Dependency order is explicit and correct (schemas → core → orchestration → interface → tests → notebooks).
- [ ] Integration points are identified and callers are listed.
- [ ] Validation criteria are concrete and testable.
- [ ] Human has confirmed the plan.

---

## Related Skills

* `SKILL: write-spec` — run before this
* `SKILL: decompose-tasks` — run after this is confirmed
* `SKILL: design-layered-module` — use if layer assignments are unclear
