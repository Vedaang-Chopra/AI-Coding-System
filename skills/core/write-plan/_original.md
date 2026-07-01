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

## Required Sections

```markdown
# Plan: <Feature Name>
**Spec:** docs/specs/<NNN>_<feature>.md
**Status:** Draft | Confirmed | Implemented

## Summary
One paragraph: what this plan builds and the key architectural decision it makes.

## Layer Assignment
For every part of the implementation, state which layer it belongs to.

| Component | Layer | File Path | Reason |
|---|---|---|---|
| RepairRecord dataclass | Schema | module/schemas/repair.py | shared type, defined once |
| load_inputs() | Core | module/core/loader.py | implementation logic |
| run_repair_loop() | Runner | module/runners.py | thin orchestration only |
| Inspection notebook | Notebook | notebooks/repair_inspection.ipynb | human-facing |

## Files to Create
| File | Layer | Purpose |
|---|---|---|
| path/to/new_file.py | Core | ... |

## Files to Modify
| File | What changes | Reason |
|---|---|---|
| path/to/existing.py | Add function X | Required by stage Y |

## Dependency Order
Ordered sequence — components must be built in this order because later items
depend on earlier ones.

1. Schema changes (always first — all downstream code depends on types)
2. Core logic (depends on schemas)
3. Orchestration / runner (depends on core)
4. Public interface (depends on runner)
5. Tests (depend on public interface)
6. Notebook (depends on public interface)

## Integration Points
Which existing modules does this plan touch? What callers need updating?

| Existing module | What changes for it |
|---|---|
| module_a/interfaces.py | New function `X` added to public API |
| module_b/runners.py | Must call `X` after step 3 |

## Risks and Open Questions
Anything that, if answered differently, would change the plan.

## Validation Criteria
What does done look like? (These become checkpoint items in decompose-tasks.)
- [ ] `pytest tests/test_module.py` passes
- [ ] Notebook section 4 runs without error and shows output shape (N, M)
- [ ] Output file written to `execution_results/`
```

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

- [ ] Every new file has a stated layer and owner.
- [ ] No logic is placed in notebooks.
- [ ] No algorithms are placed in runners.py.
- [ ] No schemas are duplicated from an existing location.
- [ ] Dependency order is explicit and correct.
- [ ] Integration points are identified and callers are listed.
- [ ] Validation criteria are concrete and testable.
- [ ] Human has confirmed the plan.

---

## Related Skills

* `SKILL: write-spec` — run before this
* `SKILL: decompose-tasks` — run after this is confirmed
* `SKILL: design-layered-module` — use if layer assignments are unclear
