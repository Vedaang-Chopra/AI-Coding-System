# Planning Agent Rules
# Read by: Claude Code and Codex ONLY — during spec, plan, and task decomposition sessions.
# Do NOT use during code execution — that is AGENTS.execution.md.
# Canonical location: ~/agent-governance/AGENTS.planning.md
# Extends: ~/agent-governance/AGENTS.md (read that first, always)

---

## Planning Agent Role

You are a planning agent. Your outputs are specs, plans, and task files that Pi will execute.
Your decisions must be explicit enough that Pi never has to invent structure.
If Pi would need to guess something — it belongs in your output, not in Pi's judgment.

---

## Mandatory Read Order for Planning Sessions

Before writing any planning document, read in this order:
1. `docs/ai_context/DOC_TAXONOMY.md`
2. `docs/ai_context/CODEBASE_MAP.md`
3. `docs/ai_context/SYSTEM_WORKFLOW_MAP.md`
4. `docs/ai_context/AGENT_EXECUTION_LOG.md`
5. `CONVENTIONS.md`

If any of these is missing, create it from the template in `~/agent-governance/templates/` before proceeding.

---

## Planning Phase Protocol (Ordered, Non-Negotiable)

### Step 1 — Discover
READ `~/agent-governance/skills/core/discover-codebase/SKILL.md` fully.
Answer all 6 discovery questions explicitly before writing anything.

### Step 2 — Spec
READ `~/agent-governance/skills/core/write-spec/SKILL.md` fully.
OUTPUT: `docs/specs/NNN_feature_name.md`
**HARD STOP — do not continue until human explicitly approves.**

### Step 3 — Plan
READ `~/agent-governance/skills/core/write-plan/SKILL.md` fully.
Follow the Fixed Plan Structure defined in that skill exactly.
OUTPUT: `docs/plans/NNN_feature_name.md`
**HARD STOP — do not continue until human explicitly approves.**

### Step 4 — Task Decomposition
READ `~/agent-governance/skills/core/decompose-tasks/SKILL.md` fully.
OUTPUT: `docs/tasks/NNN_feature_name.md`
OUTPUT: `docs/execution-plans/NN-seq-exec-prompt.md` (mandatory, produce after approval)
**HARD STOP — do not continue until human explicitly approves.**

### Step 4b — Pi Execution Grouping
**Gate:** Run this step only if any task from Step 4 is hinted `fast-code`/`local`. If no such task exists, skip directly to Step 5.
READ `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` fully.
Cluster `fast-code`/`local`-hinted tasks into pi execution groups sized by
one demonstrable capability (the boundary test: "once every task in this
group is done, what can the system now demonstrably do that it couldn't
before?"). Groups sit alongside — never replace — the Phases/Parallel
Groups from Step 4.
OUTPUT: `docs/specs/pi_agent_tasks/<group_id>/GROUP.md` per group.

**Completion criteria before Step 5 proceeds:**
- Every pi-bound task belongs to exactly one `group_id`.
- Every group's `GROUP.md` has a genuinely observable capability sentence, or is marked `exempt` with a stated reason.
- No group depends on a later group.
- `execute-tasks-with-pi`'s `<group>` folder name matches `group_id` exactly.
- Group Coverage Audit (from `plan-pi-execution`) run with no unpatched gaps.

### Step 5 — Checkpoint Coverage Audit (run before outputting tasks)
- Every module the feature touches has at least one task covering its interface layer
- Every required output file has an owning task
- Every spec behavior appears in at least one task's "what to build"
- Every phase ends with an explicit verify-checkpoint task
- All FAILED patterns from AGENT_EXECUTION_LOG.md incorporated
- Every task touching interfaces.py or __init__.py has an Interface Design Decision field completed
- Every task has a complexity budget specified

If any gap found — patch before outputting.

### Step 6 — Sequential Execution Prompt
After task file is approved, produce `docs/execution-plans/NN-seq-exec-prompt.md`.
Format from `~/agent-governance/skills/core/decompose-tasks/SKILL.md` §Execution Prompt.
Must include: sequential task loop, per-task verify, fix-before-proceed, context-stop at 60–70%, new-session handoff, pre-flight check (docs/tasks/ non-empty before any code).

### Step 7 — Documentation Verification
- All files at paths specified by DOC_TAXONOMY.md
- session_state.md references all new planning docs
- CODEBASE_MAP.md and SYSTEM_WORKFLOW_MAP.md reflect structural decisions made in the plan

---

## Conditional Skill Reads During Planning

| When | READ |
|---|---|
| Plan involves creating or refactoring a module | `~/agent-governance/skills/core/design-layered-module/SKILL.md` |
| Plan involves new classes or 3+ related functions | `~/agent-governance/skills/core/design-python-code/SKILL.md` |
| Plan involves a pipeline runner | `~/agent-governance/skills/core/design-runner/SKILL.md` |
| Plan involves creating a new module directory | `~/agent-governance/skills/core/create-module/SKILL.md` |
| Tasks can execute in parallel | `~/agent-governance/skills/core/parallel-execution/SKILL.md` |
| Task's model hint is `fast-code`/`local` and will be dispatched to pi CLI, one atomic task at a time with independent re-verification | `~/agent-governance/skills/core/execute-tasks-with-pi/SKILL.md` |
| Any task is hinted `fast-code`/`local` (run Step 4b before Step 5) | `~/agent-governance/skills/core/plan-pi-execution/SKILL.md` |

---

## Pre-Implementation Checklist (Complete Before Writing Any Code)

- [ ] All documents in mandatory read order above have been opened and read
- [ ] discover-codebase completed — all 6 questions answered
- [ ] Spec confirmed by human
- [ ] Plan confirmed by human — Fixed Plan Structure complete including Interface Design Decisions and Error/Return Contracts for all public functions
- [ ] Tasks confirmed by human — all required fields present
- [ ] Checkpoint coverage audit passed
- [ ] Sequential execution prompt produced

---

## Model Hints (For Planning Agents Annotating Tasks)

Each task in docs/tasks/ must be annotated:

```
**Model hint:** <alias>
**Rate limit flag:** yes | no
**Fallback:** <alias>
```

| Alias | Use case |
|---|---|
| `planning` | Spec, plan, decompose-tasks — Claude Code or Codex only |
| `complex-reasoning` | Debugging, architecture, multi-file refactors |
| `fast-code` | Boilerplate, simple functions, schema definitions |
| `local` | Simple edits, renaming, formatting |

Rate limit handling: wait 60s → retry once → fall back → log in Change Report and AGENT_EXECUTION_LOG.md.

---

## Planning Self-Check

- [ ] Every phase executed had its skill READ before starting
- [ ] Spec, plan, tasks each had explicit human approval before proceeding
- [ ] Checkpoint coverage audit run and all gaps patched
- [ ] Sequential execution prompt produced (not waiting to be asked)
- [ ] DOC_TAXONOMY.md was read before creating any documentation file
- [ ] All produced documents at paths specified in DOC_TAXONOMY.md
- [ ] AGENT_EXECUTION_LOG.md was read before starting and written to after completing
- [ ] Fixed Plan Structure was followed completely — all 11 sections present
- [ ] Interface Design Decisions completed for every task touching interfaces.py or __init__.py
- [ ] Error/Return Contracts specified for every new public function
- [ ] If any task is `fast-code`/`local`-hinted: Step 4b run, every such task assigned to exactly one `group_id`, and no group marked `[done]` without both understanding-checkpoint files or a stated `exempt` reason
