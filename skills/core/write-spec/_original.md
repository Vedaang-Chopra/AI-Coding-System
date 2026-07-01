---
name: write-spec
description: >
  Use before implementing any substantial feature, refactor, schema change, or
  workflow change — when no spec exists yet in docs/specs/. Always use before
  writing implementation code for a new feature. Implementing without a spec
  leads to scope creep, missing validation steps, and plans that never get written.
---

# SKILL: write-spec

## Trigger

Use this skill when:
* A human describes a feature to build but no spec document exists.
* Starting any task that touches more than one file.
* Before `write-plan` — a spec must exist and be confirmed before a plan is written.

---

## Purpose

A spec defines WHAT to build and WHY. It does not define HOW.

The spec is the contract between the human's intent and the agent's implementation.
It is confirmed by the human before any technical decisions are made.

---

## Spec vs Plan vs Tasks

| Document | Answers | Written by | Confirmed by |
|---|---|---|---|
| `docs/specs/NNN.md` | What? Why? Done = ? | Agent (this skill) | Human |
| `docs/plans/NNN.md` | How? Which files? Which layers? | Agent (`write-plan`) | Human |
| `docs/tasks/NNN.md` | Do what? In what order? | Agent (`decompose-tasks`) | Human |

Do not write a plan until the spec is confirmed.
Do not decompose tasks until the plan is confirmed.

---

## Output Location

`docs/specs/<NNN>_<feature_name>.md`

Use the next available sequential number for `NNN` (zero-padded, 3 digits: 001, 002...).

---

## Required Sections

```markdown
# Spec: <Feature Name>
**ID:** NNN
**Status:** Draft | Confirmed | In Progress | Implemented

## Purpose
What problem does this solve? Why is it being built now?

## Affected Modules
List of directories and files in scope. (Approximate — the plan will be exact.)

## Out of Scope
What is explicitly NOT being changed in this task.
This section is as important as the scope — it prevents silent scope creep.

## Acceptance Criteria
What does done look like? Written as observable outcomes, not implementation steps.

- [ ] Given X input, the module produces Y output
- [ ] Given invalid input Z, the module raises ValueError
- [ ] Output file is written to execution_results/
- [ ] Notebook runs top-to-bottom without error

## Validation Plan
How will the implementation be verified?
- Commands to run
- Notebook sections to check
- Test cases or assertions
- Expected output shape or metrics

## Known Risks / Limitations
What could go wrong? What tradeoffs are being made?

## Open Questions
Anything the human must answer before the plan can be written.
If any open questions exist, do not begin the plan until they are answered.
```

---

## Rules

1. Do not write the plan until the spec is confirmed by the human.
2. "Out of Scope" is required. An empty Out of Scope section is an incomplete spec.
3. Acceptance Criteria must be observable and testable — not descriptions of
   what the code will do internally.
4. Open Questions must be resolved before the plan begins. If there are
   unresolved questions, the spec status stays Draft.
5. Update Status to `In Progress` when implementation begins.
6. Update Status to `Implemented` when the final checkpoint passes.
7. If implementation diverges from the spec, update the spec to match reality.
   The spec is not a historical artifact — it describes what was built.

---

## After the Spec is Confirmed

The next step is always `SKILL: write-plan`.

Do not proceed to implementation, task breakdown, or file creation
until both the spec and the plan are confirmed.

---

## Related Skills

* `SKILL: write-plan` — always the next step after spec confirmation
* `SKILL: decompose-tasks` — runs after the plan is confirmed
* `SKILL: implement-feature` — the outer workflow that calls this skill
