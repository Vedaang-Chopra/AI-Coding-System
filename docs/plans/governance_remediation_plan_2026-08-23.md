# Governance System Remediation Plan
**Date:** 2026-08-23
**Status:** Draft — awaiting human approval. No item below has been executed.
**Baseline:** `docs/audits/full_system_audit_2026-06-30.md` + `docs/audits/full_system_audit_2026-08-23.md`
**Source of decisions:** Human + Hermes planning session, 2026-08-23.

---

## 1. Problem Statement (from the two audits)

Six confirmed problems, ordered by severity:

| # | Problem | Root cause | Evidence |
|---|---|---|---|
| P1 | Rules exist but are never verified (Change Reports 0/60, complexity budgets checked 0 times, FAILED entries mined into skills 0/19) | No mechanical gates — all enforcement is prose | 08-23 audit §4/§5 |
| P2 | Codex cannot supervise Pi (no streaming, no steering, no events) | RPC controller (spec 002) never built; stalled since 2026-07-09; still `-p` subprocess with hardcoded model | 08-23 audit §7 |
| P3 | Documentation explosion per feature (9+ artifact types, task file 020 = 1,112 lines, nothing archived) | Documents born mandatory and immortal — no sizing cap, no lifecycle | 08-23 audit §1/§3 |
| P4 | Code quality / formatting unaddressed; output varies by execution model | Zero formatter/linter rules anywhere in governance; cross-model consistency relies on prose | Confirmed gap, human-reported |
| P5 | Model identity hardcoded (`pi_controller.mjs:8`, prose alias tables) — every model swap touches code and docs | No single config source of truth | 08-23 audit §7 |
| P6 | Skill bloat: 31 skills, overlapping triggers (write-spec/write-plan/implement-feature flagged twice, unfixed), fat bodies eating executor context, no retirement pressure | System only adds after incidents, never removes | 06-30 Phase 0 §2, 08-23 §4 |

Design philosophy carried from research into production harnesses (Anthropic engineering blog, Claude Code subagent architecture):
mechanical gates over prose rules; separate evaluator from generator; progressive disclosure for skills;
strip scaffolding as models improve; orchestration = supervisor delegating to stateless workers.

---

## 2. Guiding Principles for All Fixes

1. **Mechanical or nothing.** A rule that can't be checked by a command doesn't ship. Every new gate must have its check written in the same change set.
2. **One source of truth.** Models, layer definitions, forbidden patterns — each stated in exactly one file; everything else references it.
3. **Evaluator ≠ author.** Verification of any work is done by a different model than the one that produced it, against explicit criteria.
4. **Artifacts have lifecycles.** Every document type gets a size cap and an archival path at feature closeout.
5. **Skills earn their context cost.** Lean body (~≤150 lines), detail pushed to reference files, deterministic steps become scripts.

---

## 3. Workstreams (ordered)

### WS1 — Model identity as configuration (trivial, unblocks everything)
**Fixes:** P5, part of P2.
- Create `~/agent-governance/config/models.yaml`: alias → provider/model-id, role (planning/execution/supervision), fallback chain. One line edit retires or swaps any model.
- `AGENTS.md` / `SYSTEM_OVERVIEW.md` §11 reference aliases only; delete embedded model names.
- `pi_controller.mjs` reads `PI_MODEL` from config/env instead of the line-8 constant.
**Verify:** grep shows zero hardcoded model ids outside models.yaml; controller picks up a model swap without code change.
**Effort:** ~half day.

### WS2 — Mechanical quality gates (the biggest quality lift)
**Fixes:** P4, part of P1.
- Add to CONVENTIONS.md: `ruff check` + `ruff format --check` (config committed per project) are mandatory verify-checkpoint items and pre-commit hooks in every active project.
- Notebook rule becomes mechanical: if a phase declares Type B, verify-checkpoint FAILS unless `notebooks/.../<group>.ipynb` AND `tests/integration/test_<group>_integration.py` exist and run.
- Complexity budget gets a post-hoc checker script: diff of the task's commits → function count vs stated budget → PASS/FAIL line appended to the execution log entry.
**Verify:** each gate demonstrated failing once, then passing after a fix.
**Effort:** ~1–2 days.

### WS3 — Build the Codex→Pi RPC controller (execute amended spec 002)
**Fixes:** P2, closes the cross-model attribution gap permanently.
Amendments required before build:
1. Model identity from models.yaml (WS1 dependency).
2. Spec's "own git repo" assumption updated — codex-plugin-cc is vendored into ~/agent-governance (commit `ca3a882`).
3. New requirement: executor-feedback channel — Pi may return structured BLOCKED-as-planned(reason) which routes back to the planner for replan, instead of forcing implementation of an unworkable task.
Build phases (independently approvable):
- Phase 0: empirical spike — real JSON event capture → RPC_BUILD_LOG.md with raw output.
- Phase 1: `--mode rpc` path in pi_controller.mjs alongside `-p`; schema_version/status fields.
- Phase 2: ask / steer / events commands wired into plugins/pi/commands/.
- Phase 3: REAL smoke tests driving the actual pi binary (replacing the 19 mocked tests).
**Verify:** each phase's criteria per spec 002 plan; attribution recorded per run in pi_run_log.json.
**Effort:** multi-day project; phases approved separately.

### WS4 — Document lifecycle & bloat control
**Fixes:** P3.
- Task files capped at ~150 lines; larger decompositions split into numbered sibling files.
- Feature closeout step (added to update-docs skill): archive completed spec/plan/tasks to `archive/YYYY-MM/docs/`; active docs dirs stay small.
- Merge redundant artifacts: sequential-execution-prompt merges into the tasks file; group-level files slimmed. Target: ≤6 standard artifact types per feature.
**Verify:** new-feature dry run produces ≤6 artifacts, none over cap; closeout archives cleanly.
**Effort:** ~1 day plus skill edits.

### WS5 — Skill diet (round two, after WS3 lands)
**Fixes:** P6, part of P1.
- Full overlap/duplication/context-cost audit of all 31 skills (the deep-audit prompt already drafted covers this — run it first).
- Then execute merges: write-spec/write-plan/implement-feature overlap resolution; handoff pair review; retire unreferenced skills (zero log references in 60 days).
- Enforce lean bodies: ≤~150 lines SKILL.md; long content → reference/ files; deterministic steps → scripts (pattern: execute-tasks-with-pi/scripts/).
- FAILED-mining loop made structural: closing any task whose log entry is ✗ requires proposing a Gotchas/Forbidden-Patterns line to an affected skill. Closes the 0/19 gap permanently.
- Target: ~22–24 core skills, zero duplicated rules.
**Verify:** re-run disk-vs-SYSTEM_OVERVIEW diff → zero drift; overlap matrix → zero unresolved pairs.
**Effort:** audit (1 session) + execution pass (1–2 sessions).

### WS6 — Governance self-eval suite
**Fixes:** makes P1-class decay detectable automatically.
- `~/agent-governance/tests/`: binary pass/fail scripts that scan projects for silent exceptions, missing Type-B notebooks/integration tests, stale session_state (>14 days while commits continue), oversized task files, undocumented/broken skill paths, hardcoded model strings.
- Becomes the entry condition of every future audit: auditors review failures, not raw repos.
**Verify:** suite runs green on a compliant project and catches seeded violations.
**Effort:** ~1 day.

### WS7 — Cross-project adherence pass (LAST)
**Gate:** runs only after WS1–WS6 are approved and executed.
- Sweep all active codebases against the corrected rules: layer-boundary imports, silent exceptions, interface hygiene, formatting compliance, notebook/python-equivalent presence, AGENTS.md conformance, stale docs.
- Produces per-project remediation lists, executed wave-by-wave.
**Effort:** sized after WS2–WS5 change what "compliant" means.

---

## 4. Sequencing & Dependencies

```
WS1 (models.yaml) ──┬─→ WS3 (RPC controller, multi-phase)
WS2 (gates)         │
                    ├─→ deep skill audit → WS5 (skill diet)
WS4 (doc lifecycle) ┘
WS6 (self-eval) — anytime after WS2
WS7 (project sweep) — LAST, gated on all above
```

Recommended first batch (one sitting): **WS1 + WS2** — small diffs, immediate quality effect, no architectural risk.

---

## 5. Hard Stops

- Each WS3 phase requires separate human approval before starting.
- No skill merge/archive without the audit listing it in a spec first (per 07-11 convention).
- No deletion outright — deprecate-code archival pattern everywhere.
- This plan itself changes only by human-approved amendment.

## 6. Open Questions for Human

1. Formatter choice: ruff (single tool, fast, modern) assumed throughout — confirm, or prefer black+isort?
2. Task-file cap of ~150 lines: right number?
3. WS5 target of ~22–24 core skills: acceptable reduction depth, or more aggressive?
4. WS7 scope: all actives including Financial Analytics Work's non-standard doc layout, or exclude until it migrates?

---
*Nothing in this plan has been executed. Approval of individual workstreams happens item-by-item per convention.*
