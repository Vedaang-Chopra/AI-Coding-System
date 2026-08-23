# Full System Audit — Post-Drift
**Date:** 2026-08-23
**Baseline:** `docs/audits/full_system_audit_2026-06-30.md`
**Mode:** Read-only diagnostic. No files modified. No fixes applied (per brief hard stop).
**Method note:** every count below comes from a grep/git/file command run on 2026-08-23 against current disk state.

---

## 0. Top-Line Summary Table

| Scope item | Verdict vs 06-30 baseline |
|---|---|
| 1. Drift since 06-30 | **Mixed** — several fixed, several still open, 1 regressed, several new |
| 2. Cross-model consistency | **New — partially unanswerable**: per-model attribution exists for only 3 of 6 claimed models; no violation-rate comparison possible |
| 3. Complexity budget enforcement | **New — budgets stated but unenforced**; overruns present and unflagged |
| 4. Skill set integrity | **Fixed** on disk-vs-doc drift; **still open** on FAILED→skill mining |
| 5. Enforcement vs existence | **Regressed in form** — Change Report/self-check format is not being produced per-task in the logs |
| 6. Project governance file coverage | **Mixed** — 3 of 6 checked projects fully compliant; 2 with structural doc gaps; 1 non-conforming layout |
| 7. Pi RPC controller | **Unchanged since 06-30** — build never started; all Phase 0 criteria unmet |
| 8. Memory / continuity | **Improved** in active projects; **regressed** in CAD-Physics |

---

## 1. Drift Since 06-30 (Baseline Diff)

Cites are to the 06-30 audit's own sections; status only.

| 06-30 finding (section) | Status now | Evidence |
|---|---|---|
| Phase 0 §4: all 18 skill reference paths in AGENTS.md broken (flat `.md`) | **FIXED** | `grep` of AGENTS.md/AGENTS.planning.md/AGENTS.execution.md: 22 `~/agent-governance/skills/...` references, 0 broken on disk (commit `ce7c405`) |
| Phase 0 §4: missing templates (AGENT_EXECUTION_LOG etc.) | **FIXED** | `templates/AGENT_EXECUTION_LOG.md`, `CODEBASE_MAP.md`, `SYSTEM_WORKFLOW_MAP.md` all exist (commit `dca7c7c`) |
| Phase 0 §1: design-feature-notebook DEBUG/INFO contradiction | **FIXED** | commit `9b1ae04` |
| Phase 0 §4: `_original.md` backup files in skills dirs | **FIXED** | commits `3319207`, `936fa5c` (33 files deleted); `find skills -name '_original.md'` → 0 |
| Phase 0 §5: decompose-tasks template missing complexity budget / wrapper constraint / interface form | **FIXED** | `decompose-tasks/SKILL.md` now requires complexity budget + interface-form + error contracts (commit `56ce1fa`); AGENTS.execution.md has Wrapper Test + Interface Form Test (lines 45–56) |
| Phase 2-F: CAD Design systemic silent `except Exception: pass` (7+ across 5 modules) | **FIXED** (in active code) | `grep -rnE 'except Exception:\s*(pass\|continue\|return)' "CAD Design/code_base"` including retired trees: **0 matches**. Also 0 in Shastra gaia src, Which_VLM_Router artemis_core, CAD-Physics code_base |
| Phase 2-A: 17+ function-form lazy wrappers, Shastra interfaces.py | **FIXED** | `Shastra/analysis/gaia/src/shastra_gaia/interfaces.py`: 6 defs, **0** single-delegating wrappers. CAD Design interfaces: only 2 assignment-aliases remain (`code_graphs/interfaces.py`, 114 lines, down from kitchen-sink 50+ exports) |
| Phase 2-I: kitchen-sink interfaces (CAD Design code_graphs 50+; CAD-Physics 50+) | **FIXED** (CAD Design) / **UNVERIFIABLE** (CAD-Physics) | code_graphs/interfaces.py now 114 lines / 10 import groups; feature_trees 146 lines. CAD-Physics `fea_cad_one_sample/src/interfaces.py` = 150 lines, single module — no export count comparison possible |
| Phase 3: Shastra tests import from 6 internal modules incl. private functions | **REGRESSED / STILL OPEN** | `Shastra/analysis/gaia/tests/test_gaia_trace_to_graph.py:27,31` still imports `shastra_gaia.extraction.alignment_builder`, `canonical_tdg_extractor` (internal, `# type: ignore`); `test_gaia_reuse_analysis.py:11–27` imports 6 internal `shastra_gaia.analysis.*` modules. The mechanical internal-import check added to write-tests (commit `9ba1e78`) has not been applied to these existing files |
| Phase 3: CAD Design zero behavioral tests for 17 modules | **NOT RE-CHECKED in full** — insufficient data this pass | Not sampled; flag for next targeted pass |
| Phase 1: AGENT_EXECUTION_LOG unmaintained in CAD Design (43 commits/0 entries) and CAD-Physics | **FIXED (CAD Design) / PARTIAL (CAD-Physics)** | CAD Design log now 332,909 chars, 21 distinct entry dates, last 2026-08-21. CAD-Physics log last entry 2026-07-08 (see §8) |
| Phase 1: planning chain incomplete (CAD Design no tasks/plans; CAD-Physics non-standard paths) | **FIXED (CAD Design) / STILL OPEN (CAD-Physics)** | CAD Design now has `docs/tasks/011,018,019,020`, `docs/plans/`, `docs/execution-plans/`. CAD-Physics still has **no** `docs/specs|plans|tasks` — planning artifacts remain in `docs/remediation/` and `docs/gpt-specs/` |
| Phase 0 §2: trigger overlap (write-spec/write-plan/implement-feature same trigger) | **UNCHANGED** | Not addressed by any commit since 06-30; skill set structure unchanged for these three |
| Phase 0 §3: unenforceable gates (natural-language matching in decompose-tasks §4 etc.) | **UNCHANGED** | No mechanical gate added for these specific items |
| Phase 0 §1 borderline: design-runner "runners.py OR core/ submodule" placement ambiguity | **UNCHANGED** | Text unchanged in `design-runner/SKILL.md` |
| Phase 4: notebooks miss 5–7 of 10 required sections | **UNCHANGED (not re-sampled in depth)** | Spot grep for core-imports in CAD Design notebooks: 0 hits (Layer-1 rule holding). Full section-structure re-sample not run — see Open Questions |
| **NEW** — governance repo has no CHANGELOG.md and no version string anywhere | **NEW** | `ls CHANGELOG.md` → not found; `grep -rn version` across AGENTS*.md → no version identifiers. The pending versioning item referenced by the brief is unresolved (affects §6 bootstrap-version check below) |
| **NEW** — Shastra project code carries committed virtualenvs inside the repo tree (`code_base/shastra_env/`, `tmp_nb_venv/`; Which_VLM_Router `cascadeflow/cascadeflow_env/`) | **NEW** | `find` results; these pollute every code-pattern grep and violate "outputs not written to source directories" in spirit |

---

## 2. Cross-Model Code-Pattern Consistency

**Primary finding: per-model attribution exists, but not at the granularity the brief requires.**

- `AGENT_EXECUTION_LOG.md` entries carry model tags. Distribution across the 5 logs (entries mentioning a model, excluding template/example stubs):
  - CAD Design: 189 sections; ~60 tagged entries → **codex** (~40), **gpt-5.4-mini** (~20). Examples: `## 007-INCREMENTAL-FEATURE-TREE-GEOMETRY … models=['gpt-5.4-mini']`, `## 020-1.2 … models=['codex']`.
  - Shastra/code_base: 125 sections; ~60 tagged → **codex** (all but one: `016-GAIA-TRACE-PATTERN-PPT-STORY-TIGHTEN` = gpt-5.4-mini).
  - ATHENA: 15 tagged entries → **codex** (all), plus one template example tagged `nemotron-3-ultra-550b-a55b` (an EXAMPLE block, not a real execution).
  - Which_VLM_Router, CAD-Physics: only the `[TASK_ID]` template stub mentions any model; real entries are **untagged**.
- **minimax 2.7, kimi 2.6, nvidia-nemotron (real runs), and nvidia-build have zero attributed executions anywhere in the five execution logs or task files.** `grep -rn 'minimax\|kimi\|nemotron\|nvidia' docs/tasks/*.md docs/specs/*.md` in the governance repo → 0 hits. The brief's premise that Pi "currently dispatches across" six models is **not supported by the written record** — either these models ran unattributed (a logging gap) or they haven't run (a premise gap). This ambiguity is itself the finding.
- The one machine-readable per-run source, `CAD Design/docs/specs/pi_agent_tasks/pi_run_log.json`, records 17 runs: 12 × (`openai-codex`, `gpt-5.4-mini`), 1 × (`default`, `gpt-5.4-mini`), 1 × (`openai-codex`, `unspecified`), 3 × `n/a`. All 17 have `agent_end_seen: false`. **Only gpt-5.4-mini is evidenced as actually executing through the pi pipeline.**
- **Consequence:** a matched-set violation-rate comparison across ≥3 models is **not possible with current data**. What can be said: the two models with real samples (codex, gpt-5.4-mini) both produced compliant recent work — CAD Design's 0 silent exceptions and Shastra's 0 wrapper regressions span entries from both. No violation cluster is attributable to either. That is a 2-model comparison, not the required 3+.

**Systemic?** The attribution gap is systemic: model tagging is optional in practice and absent entirely in 2 of 5 projects' logs.

---

## 3. Complexity Budget / Code Volume Enforcement

**Sample:** 9 task-to-commit pairs across 4 projects (fewer than the 15-task target — the other active projects have no task files with budgets; see gap note).

| Project | Task / commit | Stated budget | Actual diff | Overrun? | Flagged in Change Report? |
|---|---|---|---|---|---|
| CAD Design | 020-1.2 `df97c6a` | "at most 3 constants" | +104/−0, 4 files | Lines large, functions unknown | Not stated in task-file CR snippets |
| CAD Design | 020-1.3 `d230224` | "at most 2 private predicates" | +192/−0, 7 files | Unclear | No |
| CAD Design | 020-1.4 `1336823` | "at most 4 functions" | +325/−0, 5 files | Unclear | No |
| CAD Design | 020-3.x `ecd05f4` | (phase 3 budgets) | +101/−0, 5 files | No obvious overrun | No |
| ATHENA | 001 `d0956c4` (whole-feature commit) | per-task "0 new functions expected" (×7+ tasks) | **+3,377/−0, 53 files** in one commit | **Cannot be verified per-task** — commit bundles all tasks; per-task budgets unverifiable | No |
| Shastra | 005-family `5a9ce35` | **no complexity budget stated** (task files 000/005/006 predate the requirement; 0 mentions) | +888/−0, 13 files | N/A — budget absent | N/A |
| Shastra | 006-family `3235642` | no budget stated | +260/−0, 6 files | N/A | N/A |
| Which_VLM_Router | `cc72dc8` (pi bulk import) | no task file at all | **+3,517/−0, 31 files** | N/A — no budget exists | No |
| Which_VLM_Router | `e96213d` Phase 2D | no task file | +1,461/−0, 5 files | N/A | N/A |

**Findings:**

1. **Budgets are stated where tasks exist** (CAD Design 020: 20 budget fields; ATHENA 001: 13) but **budgets count functions, not lines**, and nothing measures function-count-vs-budget after the fact. No sampled entry contains a "budget overrun" statement — the overrun rate against the *stated metric* is **unmeasurable from the logs**; against *lines changed*, ATHENA's 53-file/3,377-line single commit and WVR's 31-file commit went through with no flag anywhere.
2. **Coverage gap:** Shastra task files (000/005/006) and all Which_VLM_Router work have **zero** stated complexity budgets — Shastra's tasks predate the requirement and were never retrofitted; WVR has no task files at all. That's 2 of 4 sampled projects where the mechanism simply doesn't apply.
3. AGENTS.execution.md:55 says "Exceeding it → stop and flag." There is **no recorded instance of any flag, and no recorded instance of anyone checking** — the check itself is not happening, which is the §5 pattern again.

**Systemic?** Yes — budget compliance is asserted at planning time and never verified at execution time.

---

## 4. Skill Set Integrity

### 4a. Disk vs SYSTEM_OVERVIEW §8/§9 diff (current, not old numbers)

| Tier | On disk | Documented | Drift |
|---|---|---|---|
| core | 26 dirs (`ls skills/core`) | §8 header "Core Skills (26)" | **0 drift** |
| utility | 5 (`caveman, diagnose, grill-with-docs, teach, write-a-skill`) | §9 "Utility Skills (5)" | **0 drift** |
| optional | `mcp-graph/` dir exists but **empty** | §9b says "0 active, dir left in place" | **0 drift** |
| user | no `skills/user/` exists | not documented as existing | consistent |
| staged | `relocate-to-cad-code/` (codebase-design) | §9b documents it | consistent |

**Note (internal inconsistency, minor):** SYSTEM_OVERVIEW §1 says "26 core + 5 utility + 0 optional = 31", §2 table says "Core skills (25)" and "Utility skills (6)" — the §2 table counts are **stale/wrong** relative to §1 and disk (`SYSTEM_OVERVIEW.md:48–49` vs `:35`). New finding.

### 4b. Skills created/modified since 2026-07-11 (skill-audit brief date)

From `git log -- skills/`:
- `ca3a882` (2026-07-11): added `execute-tasks-with-pi` (+2 scripts), `plan-pi-execution`; modified decompose-tasks, design-feature-notebook, verify-checkpoint, write-plan. These were spec'd via specs 003/004 — **authorized process followed**.
- `14f9f74` (2026-07-12): the skill-audit execution itself — merged grill-me→grill-with-docs, archived 5 mcp-graph skills, modified 8 SKILL.md files, per `docs/specs/005_skill_audit.md`. **Authorized process followed.**
- No skill file has been touched since 2026-07-12. **Zero ad-hoc additions since the audit.** ✅

### 4c. FAILED-entry mining into skills

- FAILED/✗ entries across the 5 project logs (excluding template stubs): **ATHENA 2, CAD Design 3, Shastra 2, Which_VLM_Router 9, CAD-Physics 3 → 19 total** (WVR's are largely stale-claim audits rather than execution failures; genuinely actionable ≈ 10).
- Skill-file changes traceable to any FAILED entry since 07-11: **0**. `grep -rl 'Gotcha\|Forbidden' skills/core/*/SKILL.md` → 1 file. The only skill edits in the window were the audit dedupe and the pi-spec additions — none cite an execution-log failure.
- **The gap identified pre-06-30 is still open: 19 FAILED entries, 0 mined into skill Gotchas/Forbidden-Patterns.**

**Systemic?** Yes — there is no procedure (skill or checklist step) that routes FAILED entries back into skill files; AGENTS.execution.md:95 only requires logging the failure, never re-mining it.

---

## 5. Enforcement vs Existence (§12 Self-Check / §13 Change Report Sampling)

**Sample:** the 30 most recent real entries in each of the two best-maintained logs (CAD Design, Shastra/code_base) = 60 entries.

| Check | CAD Design (n=30) | Shastra (n=30) |
|---|---|---|
| Entry contains a §13-format Change Report section | **0/30** | **0/30** |
| Entry contains validation evidence (pytest output, verify command, pass counts) | 20/30 | 26/30 |
| Entry contains "Validation NOT Run" or "Known Limitations" sections | **0/30** | **0/30** |
| Entry contains an explicit §12 self-check confirmation | **0/60** | — |

**Findings:**
- Validation *evidence* is being recorded (good — this is real improvement over 06-30's "0 entries" state), but the **§13 Change Report structure is not being produced at all** in either log: 0/60. Sections like "Validation NOT Run" (required, "write None for empty sections") appear 0 times across 60 samples.
- Therefore the §12 self-check checklist is **structurally unverifiable per-task** — there is no artifact in which it could be confirmed. This is the same "rule exists; enforcement doesn't" pattern as 06-30, now relocated from code patterns to process artifacts.
- The task files themselves embed per-task status lines ("Status: [x] Complete — 78 passed…", CAD Design tasks/020), which is where verification actually lives — the Change Report format has been silently replaced by task-file status lines without any authorized decision to do so.

**Systemic?** Yes.

---

## 6. Project-Level Governance File Coverage

Checked 6 of the 8 listed projects — **miniVLM and "cad-code" do not exist on this machine** (`mdfind`/`find` across `~/all_data`, home, Desktop, Documents → 0 matches for "miniVLM"; no `cad-code` directory; the nearest artifacts are CAD Design and the staged `relocate-to-cad-code/`). See Open Questions.

| Project | AGENTS.md/CLAUDE.md | Verbatim global-rule duplication | Bootstrap version declared | Required docs missing (per DOC_TAXONOMY) |
|---|---|---|---|---|
| ATHENA | AGENTS.md (71 lines) | 0 lines | **None** | none — full set present |
| CAD Design | AGENTS.md (184 lines) | 0 lines | **None** | none |
| Shastra/code_base | AGENTS.md (69 lines) | 0 lines | **None** | none |
| Which_VLM_Router | AGENTS.md (55 lines) | 0 lines | **None** | DOC_TAXONOMY, CODEBASE_MAP, SYSTEM_WORKFLOW_MAP missing from `docs/ai_context/` (templates exist at root as `*_TEMPLATE.md`, unapplied) |
| CAD-Physics | AGENTS.md (70 lines) | 0 lines | **None** | `docs/specs/`, `docs/plans/`, `docs/tasks/` all absent (artifacts in `docs/remediation/`, `docs/gpt-specs/`) — **unchanged since 06-30 Phase 1** |
| Financial Analytics Work | AGENTS.md (145 lines) | 0 lines | **None** | DOC_TAXONOMY, CODEBASE_MAP, WORKFLOW_MAP, AGENT_EXECUTION_LOG, session_state, specs, tasks all missing at standard paths (uses non-standard `docs/00_project…07_agent_rules` layout) |

- **Verbatim duplication: 0 lines across all 6** — the "extends, not duplicates" rule is holding. ✅
- **Bootstrap version: none declared in any project** — but this is **unresolved globally**, not a per-project gap: no `CHANGELOG.md` exists in `~/agent-governance` and no version string exists in any governance file, so there is nothing to declare against. Reported as unresolved per brief instruction.

**Systemic?** The doc-layout non-conformance (CAD-Physics, Financial Analytics Work, Which_VLM_Router) is systemic; the version gap is a single global unresolved item.

---

## 7. Pi RPC Controller (Spec 002 / Plan 002) — Status Against Validation Criteria

**Topline: the build has not started.** Evidence:

| Plan validation criterion | Status | Evidence |
|---|---|---|
| `RPC_BUILD_LOG.md` exists with real raw JSON from Phase 0 | **NOT MET — file does not exist** | `ls codex-plugin-cc/.agent_control/` → only `CODEX_BUILD_INSTRUCTION.md`, `ISSUES_FROM_CLAUDE.md`, `README.md`, `pi_controller.mjs` |
| Phase 0 empirical investigation ran | **NO** | No RPC_BUILD_LOG, no RPC artifacts; `.agent_runs/pi/` newest job dirs are 2026-07-06/07/08 — all pre-date the 2026-07-09 spec |
| Controller on `-p` subprocess path vs `--mode rpc` | **Still `-p`** | `pi_controller.mjs:42` builds `pi --model ${MODEL} … -p ${instruction}`; `:424` spawns `["--model", MODEL, …, "-p", instruction]`. `grep -in rpc` in the file → 0 matches |
| `MODEL = "openai/gpt-5.4-mini"` hardcoded | **Still hardcoded at line 8** | `pi_controller.mjs:8` — unchanged from the spec's cited state |
| `--append-system-prompt` wired to AGENTS.execution.md | **NOT DONE** | `:42` passes `--no-extensions --no-skills` only |
| Real (non-mocked) pi smoke test | **STILL MOCKED** | `grep -c 'process.exit' tests/pi-controller.test.mjs` → 19; fixture-based tests only; no test spawns the real binary |
| `schema_version` / streaming / tool-call / turn-count in status.json | **NOT DONE** | No RPC events exist to source them |
| `ask`/`steer`/`events` commands | **NOT DONE** | `plugins/pi/commands/` = cancel, continue, feedback, logs, questions, result, run, setup — no ask/steer/events |
| codex-plugin-cc is its own git repo (spec §6 note) | **NOTE: it no longer is** | `git rev-parse --show-toplevel` inside codex-plugin-cc → `~/agent-governance` (it was vendored into the parent repo by commit `ca3a882`, 2026-07-11). The spec's locked decision ("extend codex-plugin-cc in place; it is its own git repo") is now partially stale — the in-place location holds, the repo-separation assumption does not |

**Systemic?** The spec is 6 weeks old with zero implementation movement and no status note anywhere recording that decision. That silent stall is the systemic finding.

---

## 8. Memory and Cross-Session Continuity

| Project | AGENT_EXECUTION_LOG last write | session_state last write | Verdict |
|---|---|---|---|
| ATHENA | 2026-08-22 | 2026-08-22 | Current ✅ |
| CAD Design | 2026-08-21 | 2026-08-22 | Current ✅ |
| Shastra/code_base | 2026-08-07 (log contains a dated entry "2026-08-27" — internally inconsistent, likely typo) | 2026-08-07 | 16 days stale ⚠ |
| Which_VLM_Router | mtime 2026-08-22 but **last dated entry 2026-07-20** | 2026-08-22 | Log content 34 days stale vs touched file ⚠ |
| CAD-Physics | 2026-07-08 | 2026-07-08 | **46 days stale — regressed** from 06-30's "current" rating |
| Financial Analytics Work | no log at standard path (`docs/01_status/AGENT_EXECUTION_LOG.md` exists — non-standard location) | 2026-08-22 (current content) | Log exists but off-taxonomy |

- vs 06-30 Phase 1: CAD Design went from "43 commits, 0 entries" to a fully maintained log (**fixed**); CAD-Physics went from "current" to 46 days stale (**regressed** — it is the only project that moved backwards).
- Write discipline is per-burst, not per-task: logs cluster around active sessions (CAD Design: 21 dates, mostly July–Aug bursts) rather than after every task as AGENTS.execution.md:119 requires.

**Systemic?** Partially — continuity is maintained when a project is actively worked and decays immediately when it isn't; there is no closing ritual enforcing a final write.

---

## Open Questions for Human

1. **miniVLM and cad-code:** neither exists on this machine under any searched location. Were these renamed (miniVLM → Which_VLM_Router? cad-code → CAD Design?), retired, or do they live on another machine/volume? §6 coverage is reported for 6 of 8 for this reason.
2. **§2 model premise:** the brief states Pi dispatches across 6 models. The written record shows only gpt-5.4-mini (and codex as the planning agent) ever attributed. Should unattributed execution be treated as a logging violation to fix, or is the 6-model premise itself stale?
3. **§5 Change Report format:** task files now carry per-task status+verification lines instead of §13 Change Reports (0/60 in sampled logs). Is this an accepted de-facto replacement to formalize, or a compliance failure to correct?
4. **§7 codex-plugin-cc repo status:** the spec's locked 2026-07-09 decision assumes it is a separate git repo; commit `ca3a882` vendored it into `~/agent-governance`. Should spec 002 be amended to reflect the vendored state before any build pass?
5. **§1 Shastra stale tests:** the internal-import violations in `test_gaia_trace_to_graph.py` / `test_gaia_reuse_analysis.py` predate the new mechanical write-tests check. Fix in a remediation pass, or grandfather as acknowledged debt?
6. **Notebook §4 re-sample:** the 06-30 finding "notebooks miss 5–7 of 10 sections" was not fully re-sampled this pass (only the core-import check was re-run, which passed). Full re-sample in the next audit, or accept the checkpoint-mode redesign as having superseded the finding?

---

*Hard stop honored: no merges, archives, skill edits, or code fixes performed in this pass.*
