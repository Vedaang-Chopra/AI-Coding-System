# Agent Execution Log

# Location: docs/ai_context/AGENT_EXECUTION_LOG.md

# Updated by: every agent, after every task attempt (success or failure)

# Read by:    every agent, before starting any task

#

# PURPOSE: Prevent repeated mistakes across sessions and across models

# If an approach is marked FAILED, do not repeat it without explicit human override

---

## HOW TO USE THIS LOG

### Before starting any task

1. Open this file.
2. Search for entries matching the files, modules, or approach you plan to use.
3. If a FAILED entry exists for your planned approach: use the Resolution instead.
4. If no entry exists: proceed, but write one after completing.

### After completing or failing any task

Add an entry at the top of the Entries section using the template below.
Do not skip this step. It is a required output of every task.

---

## Entry Template

Copy this block and fill it in. Add at the TOP of the Entries section.

```markdown
## [TASK_ID] — [Task name]
**Date:** YYYY-MM-DD
**Agent:** Pi | Codex | Claude Code
**Model:** [model name actually used]
**Status:** ✓ Complete | ✗ Failed | ⚠ Partial

**Approach taken:**
[1–3 sentences describing what was tried]

**What worked:**
[Specific things that succeeded — be concrete]

**What failed:**
[Specific things that failed — include exact error messages or symptoms]

**Root cause:**
[Why it failed — be specific. "Wrong import path" not just "import error"]

**Resolution:**
[What fixed it, or what the next agent should try instead]

**Files modified:**
- `path/to/file.py`

**Verify result:**
[Exact command and output, or "Verification not run — reason"]

**Model fallback used:** yes | no
[If yes: which model was tried first, why it failed, what fallback was used]

**DO NOT REPEAT:**
[Specific anti-patterns, import paths, approaches that failed for this task/module]
```

---

## Entries

<!-- New entries go HERE, at the top -->

## DOCS-001 — Repository documentation and context maps
**Date:** 2026-10-22
**Agent:** Hermes
**Model:** gpt-6-luna-900k
**Status:** ✓ Complete

**Approach taken:**
Added a root project README, contribution and security guidance, the missing agent-context maps, and concise human operating guides. Moved the existing execution log to its documented canonical location without discarding its history.

**What worked:**
The repository self-check and Python tests passed with Python 3.14. The plugin's full Node test suite passed on rerun with `PI_MODEL` set. Markdown local-link checks and `git diff --check` passed.

**What failed:**
The default `python3 -m pytest` invocation could not import pytest. The first plugin run had four Pi-controller test failures because `PI_MODEL` was unset. The next configured plugin run had one transient background-job lookup failure; the subsequent identical run passed all 94 tests.

**Root cause:**
The system `python3` points to an environment without pytest; Python 3.14 has the test dependencies. The Pi controller deliberately exits when `PI_MODEL` is absent. The one background-job lookup failure did not reproduce on rerun; its cause is unknown.

**Resolution:**
Use Python 3.14 for the repository's current Python validation environment, set `PI_MODEL` from the configured fast-code role before running plugin tests, and preserve the initial transient failure in this record rather than treating the first run as green.

**Files modified:**
- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/ai_context/DOC_TAXONOMY.md`
- `docs/ai_context/CODEBASE_MAP.md`
- `docs/ai_context/SYSTEM_WORKFLOW_MAP.md`
- `docs/ai_context/AGENT_EXECUTION_LOG.md` (relocated from `docs/AGENT_EXECUTION_LOG.md`)
- `docs/ai_context/pi_agent_tooling_guide.md`
- `docs/human_docs/system_overview.md`
- `docs/human_docs/how_to_run.md`
- `docs/human_docs/how_to_debug.md`
- `docs/session_state.md`

**Verify result:**
`python3.14 tools/governance_selfcheck.py` → `GOVERNANCE_SELFCHECK: PASS (0 findings)`; `python3.14 -m pytest tests/ -q` → 10 passed; `PI_MODEL=gpt-5.4-mini npm test` in `codex-plugin-cc/` → 94 passed; local Markdown links → 0 broken; `git diff --check` → pass. Commit `fb3288e` was pushed to `origin/main`; a subsequent fetch confirmed remote HEAD matched local. GitHub reported the repository as public at final verification; this task did not change visibility.

**Model fallback used:** no

**DO NOT REPEAT:**
- Do not run the Pi-controller plugin tests without setting `PI_MODEL`.
- Do not assume the default `python3` has pytest installed; check the active interpreter first.
- Do not claim the full plugin test suite is green based on the first attempt; one configured rerun had a transient failure before the complete pass.

## Task: 004 — Sync codex-plugin-cc into main repo

**Date:** 2026-07-11
**Agent:** Pi
**Model:** GPT-5.4-mini
**Status:** ⚠ Partial

**Approach taken:**
Vendored `codex-plugin-cc` into the root repo by removing its nested `.git`, cleaned generated `.DS_Store` / `__pycache__` noise, added a root `.gitignore`, and updated the controller test harness to use the outer git root for generated runs while still locating the controller in the vendored package.

**What worked:**
The vendored plugin test harness now passes the controller-specific suite, and the repo no longer surfaces `.agent_runs` / `.DS_Store` noise in `git status`.

**What failed:**
The full `npm test` run in `codex-plugin-cc` exceeded the tool window before finishing, and the controller tests initially failed with `ENOENT` because they still read `codex-plugin-cc/.agent_runs/...` after the nested `.git` was removed.

**Root cause:**
The test helper was anchored to the package directory instead of the actual git root. Once `codex-plugin-cc/.git` was removed, the controller wrote runs under the outer repo root, not the package folder.

**Resolution:**
Switch the test harness to `git rev-parse --show-toplevel` for run-artifact paths while keeping the controller path inside `codex-plugin-cc`.

**Files modified:**

- `codex-plugin-cc/tests/pi-controller.test.mjs`
- `.gitignore`
- `codex-plugin-cc/.git` (removed)

**Verify result:**
`cd codex-plugin-cc && node --test tests/pi-controller.test.mjs` → pass. `cd codex-plugin-cc && npm test` reached the long-running tail of the suite but did not finish before the tool window closed.

**Model fallback used:** no

**DO NOT REPEAT:**

- Do not anchor controller tests to `codex-plugin-cc/.agent_runs` once the nested git is removed.
- Do not rely on the full plugin suite finishing inside a short tool window; use targeted tests for the vendoring/root-path change.

## Task: 002 — Pi Agent Tooling Guide

**Date:** 2026-07-05
**Agent:** Codex
**Model:** GPT-5
**Status:** ✓ Complete

**Approach taken:**
Created a documentation-only operator guide for external coding agents that need to use this machine's existing Pi setup. Grounded the guide in the governance repo files and installed Pi docs for CLI modes, tools, trust, skills, extensions, packages, prompt templates, RPC, SDK, and security behavior.

**What worked:**
The guide was added at `docs/ai_context/pi_agent_tooling_guide.md` with practical command patterns for subprocess, RPC, SDK, extension-worker, skill, package, and prompt-template workflows. `SYSTEM_OVERVIEW.md` now lists the guide in the documentation structure.

**What failed:**
Nothing.

**Root cause:**
Not applicable.

**Resolution:**
Future agents can read `docs/ai_context/pi_agent_tooling_guide.md` before using Pi as a worker or coordinating Pi from another harness.

**Files modified:**

- `docs/ai_context/pi_agent_tooling_guide.md`
- `SYSTEM_OVERVIEW.md`
- `docs/AGENT_EXECUTION_LOG.md`

**Verify result:**
`test -f docs/ai_context/pi_agent_tooling_guide.md`; required-topic `rg`; discoverability `rg`; placeholder `rg`; and `git diff --check` were run after writing.

**Model fallback used:** no

**DO NOT REPEAT:**

- Do not describe built-in Pi subagents, plan mode, permission popups, built-in MCP, built-in to-dos, or background bash as core features.
- Do not assume project-local Pi resources load in non-interactive mode without trust or `--approve`.

<!-- Example entry — delete when real entries are added:

## EXAMPLE-1 — Build repair loop core
**Date:** 2026-06-01
**Agent:** Pi
**Model:** qwen2.5-coder:7b (local)
**Status:** ⚠ Partial

**Approach taken:**
Implemented the repair loop using a recursive call structure within `repair_loop.py`.

**What worked:**
The incremental B-Rep trajectory analysis logic was correct.
Logging with `getLogger(__name__)` worked cleanly.

**What failed:**
Import of `BRepUtils` from `src/cad_design/core/brep_utils.py` raised ModuleNotFoundError.
The CODEBASE_MAP.md had a stale path — `brep_utils` had moved to `src/utils/brep/`.

**Root cause:**
CODEBASE_MAP.md was not updated when brep_utils was refactored last session.

**Resolution:**
Corrected import to `from src.utils.brep.brep_utils import BRepUtils`.
Updated CODEBASE_MAP.md to reflect current location.

**Files modified:**
- `src/repair/repair_loop.py`
- `docs/ai_context/CODEBASE_MAP.md`

**Verify result:**
`pytest tests/test_repair_loop.py -v` → 8/8 passing

**Model fallback used:** no

**DO NOT REPEAT:**
- Do not import BRepUtils from `src/cad_design/core/`. It lives in `src/utils/brep/`.
- Do not trust CODEBASE_MAP.md without cross-checking against actual file tree for brep utilities.

-->

---

## Task: 001 — Governance Skill Fixes

**Date:** 2026-06-29
**Agent:** Claude Code (claude-sonnet-4-6)
**Status:** ✓ Complete

### What was attempted

Targeted additions to 4 skill files + SYSTEM_OVERVIEW.md §8, based on 4 confirmed
failure patterns from real project output (Shastra). No existing content removed.

### What worked

All 5 files edited successfully. Validation grep checks pass for all criteria.

### Files changed

- `skills/core/design-layered-module/SKILL.md` — added two-tier interface model to Layer 2; added violation pattern; fixed stale `write-notebook` → `design-feature-notebook` reference
- `skills/core/design-feature-notebook/SKILL.md` — added Stage Function Audit pre-check gate (Step 0); added data/ML and agentic/LLM workflow templates (Step 1); restructured "Before Creating" into 3 steps; added forbidden-pattern checklist items
- `skills/core/design-python-code/SKILL.md` — added Step 5 "Named OOP Patterns" section with 4 patterns (Registry, Cache-bearing, Config/Paths dataclass, Strategy/Protocol), each with detection trigger + code example; added 4 checklist items
- `skills/core/add-observability/SKILL.md` — added "Three Mandatory Rules" section before Reversal Rule: Rule 1 (named params, not arg0); Rule 2 (log level by call context + loop aggregation pattern); Rule 3 (INFO line content standard)
- `SYSTEM_OVERVIEW.md` — updated §8 entries for all 4 skills to reflect new rules

### What failed

Nothing.

### Do-not-repeat

- Do not add the 4 OOP patterns again — they are now in Step 5 of design-python-code.
- Do not add two-tier interface content again — it is now in Layer 2 of design-layered-module.
- The notebook skill is `design-feature-notebook`, not `write-notebook`.

---

## Task: 003 — Pi Execution Grouping & Understanding Checkpoints

**Date:** 2026-07-10
**Agent:** Claude Code (claude-sonnet-5)
**Status:** ✓ Complete

### What was attempted

Per spec/plan 003: formalized `<group>` in `execute-tasks-with-pi`'s
`docs/specs/pi_agent_tasks/<group>/` path (previously an ad hoc date+slug
label, confirmed by inspecting CAD Design's real
`2026-07-09_visual_analysis` directory — no `GROUP.md`, no capability
statement existed there) into a new `plan-pi-execution` skill defining a
capability-sized "pi execution group" and a mandatory per-group
understanding checkpoint (notebook + Python integration test, authored by
the planning agent, never pi).

### What worked

All 5 files edited/created; all plan §11 validation commands pass; `git
diff AGENTS.md` confirmed empty (universal file untouched, as spec required).

### Files changed

- `skills/core/plan-pi-execution/SKILL.md` (new) — boundary test, `GROUP.md` template, Group Coverage Audit, mandatory understanding checkpoint + authorship rule
- `skills/core/execute-tasks-with-pi/SKILL.md` — Scope-and-Boundary row, `<group>` = `group_id` clarification in Setup, Related Skills entry
- `AGENTS.planning.md` — new Step 4b (gated on any `fast-code`/`local` task), Conditional Skill Reads row, Planning Self-Check line
- `AGENTS.execution.md` — one line under Notebook + Python Equivalent Rule: Pi does not author group-level understanding notebooks
- `SYSTEM_OVERVIEW.md` — §5 diagram gate inserted, §8 skill entry added (count 24→25 everywhere referenced), §10 two new forbidden patterns, Last updated bumped to 2026-07-10

### What failed

First edit attempt to `AGENTS.planning.md` mis-ordered Step 4b (inserted
after Step 5's content instead of before it, and accidentally duplicated
the "Step 5" heading over what should have been "Step 6"). Caught by
`grep -n "^### Step"` showing two "Step 5" headings and a missing "Step 6"
immediately after the edit — fixed with a corrected replacement before
moving on. Root cause: old_string for the Edit call matched further into
the file than intended because "If any gap found — patch before
outputting." appears verbatim only once, but I placed the new heading text
using the wrong step number by hand instead of re-reading the surrounding
headings first.

### Do-not-repeat

- After any Edit that inserts a new numbered step/section into an ordered
  list, immediately grep for the heading pattern (e.g. `^### Step`) to
  confirm ordering and uniqueness before moving to the next task — don't
  assume the edit landed where intended just because the tool reported success.
- Do not retrofit existing `pi_agent_tasks/<group>/` directories (e.g. CAD
  Design's `2026-07-09_visual_analysis`) to the new `GROUP.md` format — out
  of scope per spec 003, confirmed still valid.

## Task: 004 — Phase-Sized Checkpoints & Two Test Types

**Date:** 2026-07-11
**Agent:** Claude Code (claude-sonnet-5)
**Status:** ✓ Complete

### What was attempted

Per the human brief `docs/tasks/governance_brief_phase_checkpoints_and_test_types.md`:
added a canonical phase-sizing rule to `decompose-tasks` (one demonstrable
capability, one-sentence boundary test), named the existing pytest check
"Type A" and added "Type B" — a lightweight per-phase understanding
notebook via a new checkpoint mode in `design-feature-notebook`, sitting
alongside the existing full 10-section feature-completion mode.
`verify-checkpoint` gates on both at the phase level. The brief's §0
instructed locating and archiving a prior "governance_pi_execution_planning_brief.md"
as an unexecuted proposal — that file does not exist anywhere in the repo;
its described substance had already shipped as `plan-pi-execution/SKILL.md`
(task 003, checkpoint-passed 2026-07-10, the day before this brief was
written). Flagged this in spec 004 as an Open Question instead of guessing;
human resolved it: drop the archive instruction entirely, make exactly one
narrow edit to `plan-pi-execution/SKILL.md` (its Boundary Test section now
points to `decompose-tasks`'s canonical rule instead of restating it), and
touch nothing else there. Human also resolved the Phase vs. pi-execution-group
containment question: Phase is the general container, pi execution group is
a Pi-specific refinement nested inside a phase, both sized by the same test.

### What worked

All 6 files edited; all spec 004 / plan 004 §11 validation commands pass;
`git diff AGENTS.md` confirmed empty. Two hard-stops were used exactly as
the brief required (after §0/spec, and after the human's resolution before
`write-plan`); the human then explicitly authorized finishing plan → tasks
→ implementation → verify in one continuous pass with no further pauses.

### Files changed

- `skills/core/decompose-tasks/SKILL.md` — new "Phase sizing rule" and "Two test types" subsections in §3 (canonical, single statement); `**Type A:**`/`**Type B:**` fields added to the Phase block template; 2 new Checkpoint Coverage Audit items
- `skills/core/plan-pi-execution/SKILL.md` — Boundary Test (Rule 1) section body replaced with a pointer to `decompose-tasks`'s canonical rule; nothing else in the file touched (frontmatter description, Scope-and-Boundary table, GROUP.md template, Rule 2, Related Skills all left as-is, per explicit human scope instruction)
- `skills/core/verify-checkpoint/SKILL.md` — new step 2b (Type A always checked; Type B checked when promised, satisfied by existing group-level files for pi-execution-group phases); 2 new Valid Checkpoint Items
- `skills/core/design-feature-notebook/SKILL.md` — new "Two Modes" comparison table; existing 10-section structure relabeled "Feature-Completion Mode"; new "Checkpoint Mode (Per-Phase, Lightweight)" section; explicit statement that `plan-pi-execution`'s group notebooks use checkpoint mode
- `skills/core/write-plan/SKILL.md` — one line added to Related Skills pointing to the rule, no restatement
- `SYSTEM_OVERVIEW.md` — §8 entries updated for `decompose-tasks`, `verify-checkpoint`, `design-feature-notebook`, `write-plan`, and a targeted correction to `plan-pi-execution`'s boundary-test bullet (points to decompose-tasks instead of restating); Last updated bumped to 2026-07-11
- `docs/specs/004_phase_checkpoints_and_test_types.md` (new), `docs/plans/004_phase_checkpoints_and_test_types.md` (new), `docs/tasks/004_phase_checkpoints_and_test_types.md` (new)

### What failed

First edit to `decompose-tasks/SKILL.md`'s phase-sizing rule wrapped the
phrase "one demonstrable capability" across two markdown blockquote lines
(`> ...one demonstrable` / `> capability...`), so `grep -c "one demonstrable
capability"` returned 0 against the plan's own validation command. Caught
immediately by running the full validation suite before declaring done —
fixed by collapsing the blockquote to a single line so the canonical phrase
is grep-matchable exactly as the spec's Validation Plan expects.

### Do-not-repeat

- When a validation command greps for an exact multi-word phrase, do not
  write that phrase inside a wrapped markdown blockquote (`> line1\n>
  line2`) — grep matches per line by default, so any inserted rule text
  a later grep check depends on for exact-match must be verified against
  the actual grep command immediately after writing it, not assumed correct
  from visual review of the rendered markdown.
- When a brief's §0 asks to locate and archive a "prior brief" by filename,
  search by content/topic as well as filename before concluding it doesn't
  exist — but if it genuinely isn't found and the substance it describes
  already shipped as real, integrated work, do not guess at reconciling the
  two. Surface it as a spec Open Question and let the human decide the scope
  of any unwinding — this saved a costly wrong guess (unwinding
  checkpoint-passed, already-integrated work) in this task.

---

## 2026-08-23 — Model-agnostic consistency Fix Batch 1 (WS1+WS2)

**Agent/model:** Hermes desktop (ox-alpha via openrouter)
**Status:** ⚠ Partial — Tasks 1–5 + 7 complete and committed; Task 6 blocked at human gate

### What was attempted
Executed the 7-task fix batch per `.hermes/plans/2026-08-23_execution_brief_model_agnostic_batch1.md`
with the Claude-review amendments (discovery step, complexity script reordered before skill
wiring, "specified not mechanical" language, verbatim stdout provenance rule).

### What worked
- TDD discipline held: models guard test went RED with exactly 11 offender sites, GREEN after purge.
- `config/models.yaml` role-based config; grep sweep over rule files now zero-hit.
- `pi_controller.mjs` MODEL → `PI_MODEL` env var with fail-loud exit (node --check passes).
- `tools/check_complexity_budget.py`: 10 tests green; fixed format `COMPLEXITY_BUDGET: PASS (N/B new defs)`.
- Specified gates wired into verify-checkpoint + decompose-tasks.
- `governance_selfcheck.py`: PASS on real repo, FAIL(3) on broken fixture (negative test verified).
- Full validation: pytest 10/10, ruff check+format clean on tools/ and tests/.

### What failed / discrepancies
- Brief said model table lived in SYSTEM_OVERVIEW §11 — actually in AGENTS.planning.md §Model hints.
  Purged where actually found.
- CONVENTIONS.md did not exist despite AGENTS.md referencing it — created it (Formatting seed section).
- System python3 is 3.9 (no tomllib): selfcheck got a try/except fallback; use python3.14 for full parse.
- Two initial unit-test failures were fixture-count bugs in my own tests, not script bugs.

### Blocked / awaiting human
- Task 6 hard stop honored: ruff.toml copied to CAD Design + Shastra but `ruff format` NOT applied.
  Churn: CAD 1,711 files/~58k lines, ~7k lint findings (incl. 191 F821 needing triage);
  Shastra 93 files/~480 findings. Decisions needed: lint-ignore strategy, safe-fix scope,
  handling of Shastra's pre-existing dirty notebooks.

### Do-not-repeat
- Verify brief file references (CONVENTIONS.md, §11) against disk before executing — two were wrong.
- copytree fixtures must pass symlinks=True or broken skill symlinks abort the copy.

### Follow-up (2026-08-27): Task 6 executed
COMPLEXITY_BUDGET: n/a (governance side unchanged; no new python)
- Applied format to pilots; disclosures above in session_state.md.
- Do-not-repeat #3: when diffing dirty-set lists with awk on porcelain output, use $NF (or sed),
  never $2 — ' M'-prefixed lines collapse and silently shrink the exclusion set.
