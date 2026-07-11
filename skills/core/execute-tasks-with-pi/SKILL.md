---
name: execute-tasks-with-pi
description: >
  Use when a planning agent (Claude Code or Codex) needs to hand individual
  tasks from docs/tasks/ to the pi CLI for mechanical execution, one atomic
  task per non-interactive pi invocation, with independent verification and
  a durable JSON run log. Complements decompose-tasks (which produces the
  task list and its own long-session "Sequential Execution Prompt") by
  providing an alternative, tighter-loop invocation mechanism: one pi
  subprocess per task instead of one long interactive pi session working
  through many tasks unsupervised. Prefer this pattern when the execution
  model is known to be unreliable on compound instructions (e.g.
  gpt-5.4-mini) and the planning agent wants to independently verify after
  every single task rather than after a whole batch. Triggers: "use pi to
  execute this", "delegate to pi", "run this through the coding agent",
  "log the pi run", "verify via pi".
---

# SKILL: execute-tasks-with-pi

## Scope and Boundary

| Skill | Handles |
|---|---|
| `decompose-tasks` | Breaks an approved plan into `docs/tasks/NNN.md` with per-task what/where/verify/model-hint. Also defines a long-session "Sequential Execution Prompt" where one interactive pi session works through many tasks in a row. |
| `plan-pi-execution` | Clusters this skill's atomic tasks into capability-sized "pi execution groups" and defines the mandatory understanding checkpoint (notebook + Python integration test) gating the next group's dispatch. Run after `decompose-tasks`, before dispatching any task through this skill. |
| `execute-tasks-with-pi` (this skill) | An alternative execution mechanism for tasks already produced by `decompose-tasks`: **one non-interactive pi subprocess per atomic task**, captured to a file, independently re-verified, and logged — instead of handing pi a multi-task session to run unsupervised. |

Use `decompose-tasks` first to produce the task list. Use this skill to actually
dispatch each task once the model hint says `fast-code`/`local` (i.e., a small,
low-reliability model) **and** the planning agent wants a verification
checkpoint after every single task rather than trusting a longer autonomous
run. For `complex-reasoning`-hinted tasks or when the execution model has a
clean reliability track record, the `decompose-tasks` long-session pattern may
be more efficient — this skill trades some per-task overhead for a tighter
trust boundary.

---

## Why this exists (evidence, not assumption)

A prior delegation attempt (project: CAD Design, 2026-07-08) gave pi/
gpt-5.4-mini a real task ("move two functions, keep the public re-export
contract"). Pi's own self-reported verification (`pytest` passed) was
accurate but incomplete — it had silently broken the re-export it was told
not to touch, and the existing test suite didn't cover that specific surface.
Independent re-verification by the planning agent caught it; nothing else
would have. **This is the reason the pattern below insists on independent
verification after every task, not just a self-report.**

A second finding (2026-07-09): pi's own process **exit code is not a
reliable success signal**. An unrelated bug in an installed `pi-auto-rename`
extension crashes the process with exit code 1 *after* pi has already
produced a correct, complete response. Confirmed twice with direct calls:
raw `returncode == 1` while `"type":"agent_end"` was genuinely present in the
`--mode json` output stream. Do not gate success on `$?` — parse the stream.

---

## Setup

`<group>` in the paths below is not an ad hoc label the dispatching agent
invents — it is `plan-pi-execution`'s `group_id`: a cluster of atomic tasks
sized by one demonstrable capability, with its own `GROUP.md` at
`docs/specs/pi_agent_tasks/<group_id>/GROUP.md`. Run `plan-pi-execution`
before dispatching any task in a new group.

Copy both scripts from this skill's `scripts/` directory into the target
project, preserving the relative structure:

```
<project>/tools/pi_agent/run_pi_task.py
<project>/tools/pi_agent/query_pi_log.py
```

Create the log file at `<project>/docs/specs/pi_agent_tasks/pi_run_log.json`:

```json
{
  "schema_version": 1,
  "description": "Append-only log of every pi CLI dispatch. One record per pi invocation. Query with tools/pi_agent/query_pi_log.py instead of reading this file directly once it grows.",
  "runs": []
}
```

Both scripts are stdlib-only (no dependencies) and take no project-specific
hardcoded paths — `query_pi_log.py` defaults to
`docs/specs/pi_agent_tasks/pi_run_log.json` relative to CWD, override with
`--log-path` if the project uses a different layout.

---

## Invocation syntax

```bash
pi --provider openai-codex --model gpt-5.4-mini --mode json -p "<single, atomic instruction>"
```

Plain `--model gpt-5.4-mini` alone resolves to `azure-openai-responses`
(usually no key configured) — `--provider openai-codex` is mandatory. Swap
provider/model for whatever this project's actual execution-model alias
resolves to; the mechanism below is model-agnostic.

**Never call `pi` directly and check `$?`.** Always go through the wrapper:

```bash
python3 tools/pi_agent/run_pi_task.py \
  --prompt-file docs/tasks/<feature>/task-N.md \
  --out docs/specs/pi_agent_tasks/<group>/runs/task-N.ndjson \
  --timeout 300
```

It prints `agent_end_seen: True/False`, the path to the full raw stream (do
not read this file directly unless actively debugging — it can run into
megabytes for a single trivial task), and pi's final assistant message. Its
own exit code (0/1) is trustworthy — it's derived from `agent_end_seen`, not
from pi's process exit code.

---

## One-atomic-task-per-dispatch discipline

Every task sent to a small/unreliable execution model must be:
- **ONE file.** Multi-file tasks should be split into one dispatch per file.
- **ONE change.** Not "and" — if the task needs "and," split it.
- **ONE explicit constraint list**, spelled out literally. Do not assume the
  model will infer an implied contract (e.g., "don't change `__all__`" is not
  enough if the fix also requires adding a re-export — name the exact
  mechanism, e.g. "add both names to the existing `_LAZY_EXPORTS` dict").
- **ONE verification command** (or a short fixed list) stated in the task
  itself, so the model has an unambiguous definition of done.

Write these as paired files per task, matching `decompose-tasks`' task
numbering: `task-N.md` (the instruction, in the format `decompose-tasks`
already produces — Purpose, Allowed Edit Scope, Exact Instructions,
Acceptance Criteria) and `test-N.md` (the independent verification commands,
written by the planning agent *before* dispatch, never by the execution
model).

---

## Independent verification — including the verifier itself, via pi

Two verification modes, pick based on how expensive/verbose the check is:

**Mode A — planning agent runs the check directly** (via its own Bash tool).
Fine when the check is short (a `py_compile`, a small `pytest -q` on one
module, a fresh-interpreter import). The planning agent's own tool-call
output is already compact in this case; there is no token benefit to
indirecting through pi.

**Mode B — dispatch verification through a second, separate pi call.**
Use this when the check itself would be verbose (a full-repo test suite, a
notebook execution, a large lint pass) and the planning agent wants to avoid
that raw output landing directly in its own context. Dispatch `test-N.md`'s
commands as a **second, independent `run_pi_task.py` call**, separate from
the one that made the edit.

**Critical constraint — do not skip this:** the verification prompt must
explicitly demand **verbatim command output**, not a self-assessment. A
prompt like "run the tests and tell me if they pass" produces exactly the
same failure mode as trusting the execution model's own self-report — a
second LLM's "yes it passed" is not evidence, it is another unverified claim.
The verification prompt must say, literally:

```
Run exactly these commands and report the COMPLETE VERBATIM stdout/stderr
of each one, unmodified, inside a code block. Do not summarize, paraphrase,
or interpret the output — the exact text is required. If a command fails,
report the exact failure output, do not describe it in prose.

1. <command 1>
2. <command 2>
...
```

The planning agent then reads the verification pi run's raw reported output
(via `run_pi_task.py`'s printed final message, which contains that verbatim
block) and makes its own pass/fail judgment from the literal text — the same
judgment it would make if it had run the command itself. This preserves the
evidentiary chain (raw tool output → judgment) while moving the token cost of
holding a large output buffer into pi's own context/NDJSON file instead of
the planning agent's.

Log both dispatches (execution + verification) as separate entries in the
JSON run log, and record the verification run's `run_id` in the execution
run's `independent_verification.notes` field so the two are linked.

---

## JSON run log

Append-only, one record per pi dispatch (execution or verification), at
`docs/specs/pi_agent_tasks/pi_run_log.json`. Required fields: `run_id`,
`group`, `task_id`, `fix_plan_item` (or equivalent task reference), `task_spec`,
`test_spec`, `started_at`, `ended_at`, `provider`, `model`, `pi_exit_code`
(the wrapper's own exit code, not raw pi's), `pi_agent_end_seen`,
`pi_reported_status`, `files_touched`, `independent_verification` (dict:
`commands`, `result`, `notes`), `final_status` (one of `verified_complete` /
`verified_failed` / `needs_human_review` / `in_progress`), `notes`.

```bash
python3 tools/pi_agent/query_pi_log.py list [--group G] [--status S]
python3 tools/pi_agent/query_pi_log.py show <run_id>
python3 tools/pi_agent/query_pi_log.py summary
python3 tools/pi_agent/query_pi_log.py append <path-to-record.json>
```

Use `list`/`summary` to review past runs — that is the entire point of the
script. Reading the raw JSON file directly defeats it once the log has more
than a handful of entries.

---

## Token/cost economics — what is actually established vs. assumed

**How to add real data instead of debating this in the abstract:** every
group executed through this pattern should end with a "Pi Pipeline
Retrospective" written into that group's `AGENT_EXECUTION_LOG.md` entry —
task count, how often `pi_reported_status` diverged from the eventual
`final_status` (the concrete measure of whether independent verification
was actually load-bearing that time), total `duration_s` across dispatches
(now captured automatically by `run_pi_task.py`, not hand-guessed), and an
honest note on whether it felt faster or slower than direct editing for that
specific set of tasks. First one scheduled: CAD Design project, fix-plan item
#11 (`visual_analysis`), 2026-07-09 handoff. Check
`docs/ai_context/AGENT_EXECUTION_LOG.md` there for whatever it actually
showed before assuming either direction.

**Established by direct measurement (live demos, 2026-07-09, CAD Design
project):** a trivial single-file task produced 4.3MB of raw pi NDJSON
output. The planning agent never read that directly — only the wrapper's
~10-line parsed summary. Separately, a bare reply-only round trip (no file
edit, no tools) took ~10 seconds wall-clock — that is the floor per
dispatch, before any actual work happens; a real file-editing task will take
longer. Sequential dispatch of many small tasks should be expected to cost
real wall-clock time, not just tokens — factor this in separately from the
token/cost argument below. For any task whose raw tool-call trace would
otherwise land in the planning agent's own context (verbose test output,
large diffs, long tool chains), routing through pi + this wrapper avoids
that volume entirely. This is a real, measured effect, not a projection.

**Not yet established — do not overclaim this to a user:**
- Whether the wrapper pattern nets positive on **total** planning-agent
  tokens for a typical task. Writing a correctly-scoped `task-N.md` requires
  the same code investigation a direct edit would need. Writing `test-N.md`,
  running independent verification, and building/appending a JSON log record
  are pure overhead on top of that investigation. For a task small enough
  that the planning agent could just make the edit directly in one or two
  tool calls, the formal task/test/log overhead likely **costs more**
  planning-agent tokens than doing the edit directly — there is no measured
  counterexample yet.
- The likely net-positive cases, reasoned but not measured: (a) tasks with
  large mechanical/repetitive scope across many files, where one clear task
  spec replaces many manual edit tool calls; (b) tasks whose *verification*
  step alone is heavy (full suites, notebook runs) even if the edit itself is
  small; (c) dollar-cost savings from routing bulk mechanical work to a
  cheaper model, which is a real economic benefit independent of the
  planning agent's own token count.
- **Recommendation until more data exists:** default to direct editing for
  single-file, well-understood, low-verification-cost fixes. Reach for this
  skill when the task is large/repetitive, or when verification alone would
  flood the planning agent's context if run directly.

---

## Known reliability lessons (gpt-5.4-mini via pi, confirmed 2026-07-08/09)

- Compound, multi-file, multi-constraint prompts increase the chance of a
  silently-incomplete edit (see the re-export incident above). Split further
  than seems necessary.
- pi has a documented history of hanging with zero output on trivial
  prompts, unrelated to task complexity. Always dispatch with an explicit
  `--timeout`; be ready to get nothing back and retry or escalate to a
  human/planning-agent-direct edit.
- Process exit code is not trustworthy (see above) — always check
  `agent_end_seen`, never `$?`, on either execution or verification calls.

---

## Related Skills

- `decompose-tasks` — produces the task list this skill executes against;
  read its task-file format before writing `task-N.md`.
- `plan-pi-execution` — clusters tasks into the `group_id` this skill's
  `<group>` folder name must match; defines the understanding checkpoint
  gating the next group's dispatch.
- `verify-checkpoint` — run at phase boundaries, independent of per-task
  verification done here.
- `handoff-coding-agent` — if a session ends mid-group, write
  `docs/session_state.md` noting which `task-N`/`test-N` pairs are dispatched,
  verified, or still pending, plus the relevant `run_id`s.
