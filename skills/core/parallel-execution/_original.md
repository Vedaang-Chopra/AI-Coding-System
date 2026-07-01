---
name: parallel-execution
description: Design parallel task groups when decomposing tasks. Read before annotating task files with parallel execution groups.
---

# Skill: parallel-execution
# When to use: When decomposing tasks and some can execute concurrently.
#              Read this before annotating any task file with parallel groups.

---

## 1. When parallelization is valid

A set of tasks is parallelizable if ALL of the following are true:
- No task in the group reads a file written by another task in the same group.
- No task in the group modifies a shared schema or config read by another task in the same group.
- Tests for each task run against that task's outputs only.

When in doubt, make it sequential. Parallel complexity is only worth it for phases
with 3+ independent tasks that each take meaningful time.

---

## 2. Dependency analysis (required before grouping)

Before assigning parallel groups, produce this dependency table for the phase:

```markdown
### Phase N Dependency Analysis

| Task | Reads from | Writes to | Depends on tasks |
|---|---|---|---|
| N.1 | [source] | [output] | none |
| N.2 | [source] | [output] | none |
| N.3 | N.1 output | [output] | N.1 |
| N.4 | N.2 output | [output] | N.2 |
| N.5 | N.3 + N.4 outputs | [output] | N.3, N.4 |
```

Tasks with "none" in "Depends on" → candidate for parallel group.
Tasks sharing a dependency form a group that starts after that dependency resolves.

---

## 3. Parallel group notation

Use this exact format in task files:

```markdown
## Phase N — [Phase Name]

### Group N-A — Parallel (no dependencies)
Tasks in this group can execute concurrently.
Model assignment: see individual tasks.

#### Task N.1 — [Name]
**Parallel group:** N-A
**Model hint:** fast-code
**Rate limit flag:** yes
**Fallback:** local
**Depends on:** none
**File(s):** `src/module/file_a.py`
**What to build:** [exact description]
**Verify:** `pytest tests/test_file_a.py -v`

#### Task N.2 — [Name]
**Parallel group:** N-A
**Model hint:** fast-code
**Rate limit flag:** yes
**Fallback:** local
**Depends on:** none
**File(s):** `src/module/file_b.py`
**What to build:** [exact description]
**Verify:** `pytest tests/test_file_b.py -v`

---
### *** SYNC POINT N-A ***
Before proceeding to Group N-B:
- [ ] Task N.1 verify command passes
- [ ] Task N.2 verify command passes
- [ ] No unresolved errors in Change Reports for N.1 and N.2
---

### Group N-B — Parallel (depends on N-A)
...

### Group N-C — Sequential (integration)
**Note:** This group must run sequentially after all prior sync points.
...
```

---

## 4. Model assignment for parallel groups

When two tasks are truly parallel (different processes/agents), assign different model
aliases to avoid shared rate limits:

```markdown
#### Task N.1 — [Name]
**Model hint:** complex-reasoning   ← paid tier, no rate concern

#### Task N.2 — [Name]
**Model hint:** local               ← local Ollama, no rate concern
```

When running with a single agent (Pi executing sequentially despite the parallel
annotation), tasks still execute one at a time but the annotation tells Pi it can
move immediately from N.1 to N.2 without waiting for a human gate between them.

**Concurrent execution (two actual Pi instances):**
- Human starts two Pi sessions, gives each a task ID.
- Each Pi reads its task, executes, writes Change Report and AGENT_EXECUTION_LOG entry.
- Human verifies both at the sync point before starting the next group.

**Single-agent sequential execution of parallel groups:**
- Pi executes N.1, then N.2 without a human gate between them.
- Human verifies at the sync point only.

---

## 5. Rate limit handling within parallel groups

If a parallel group assigns the same free-tier model to multiple tasks and a single
agent is executing:

1. Execute Task N.1 → if rate-limited, wait 60 seconds → retry once.
2. If still rate-limited → use fallback model, log in Change Report.
3. Execute Task N.2 → same handling.
4. Do not attempt N.2 while waiting for the N.1 retry; keep it strictly sequential.

If different models are assigned, no rate limit interaction exists between the tasks.

---

## 6. Sync point verification procedure

At every sync point, the executing agent must:

1. Confirm every task in the preceding group has status `[x]` in the task file.
2. Confirm the Verify command for each task passed (output is in Change Report).
3. Confirm no task has unresolved errors or partial outputs.
4. Write a single sync point entry to `AGENT_EXECUTION_LOG.md`:
   ```
   ## SYNC POINT N-A — [date]
   Tasks verified: N.1, N.2
   All passing: yes / no
   Blockers: [describe or none]
   ```
5. **HARD STOP if any task in the group failed.** Do not proceed to the next group.
   Fix or escalate the failure before moving on.

---

## 7. What not to do

- Do not assign parallel groups to tasks that write to the same file.
- Do not skip sync points because tasks "looked fine."
- Do not use parallel groups to avoid human review gates at phase boundaries.
  Sync points within a phase are agent-managed. Phase boundaries still require human approval.
- Do not run more parallel groups than there are available model aliases with
  non-overlapping rate limits, unless a human is managing concurrency manually.
