# Full System Audit — Consolidated Findings
**Date:** 2026-06-30
**Scope:** Governance system (30 skill files + AGENTS.md) + three projects (CAD Design, CAD-Physics, Shastra GAIA)
**Mode:** Read-only discovery. No files modified.

---

## Phase 0 — Governance Self-Audit

### 1. Internal Contradictions

**None confirmed** across current SKILL.md files. All three checked:
- Notebook rules: `design-feature-notebook` and `design-layered-module` are fully consistent (both prohibit production logic in notebooks).
- Two-tier interface model: consistent across both skills.
- `add-observability` `print()` in notebooks: consistent with `design-feature-notebook` stage print requirement.

**Borderline:** `design-runner` says stage functions go in `runners.py` OR "appropriate `core/` submodule" — mild placement ambiguity in deeply nested pipelines, not a hard contradiction.

**New finding:** `design-feature-notebook/SKILL.md` has an internal contradiction: Section 2 template uses `logging.basicConfig(level=logging.DEBUG, ...)` but the Validation Checklist says "Setup cell configures logging.basicConfig at INFO level (not DEBUG globally)." These conflict within the same file.

### 2. Trigger Overlap

Three skills share the same trigger: "starting any feature that touches more than one file":
- `write-spec` — "Starting any task that touches more than one file"
- `write-plan` — "Starting implementation of any feature that touches more than one file"
- `implement-feature` — "Starting any new feature that touches more than one file"

They form an ordered chain (spec→plan→implement), but an agent loading only `write-spec` could treat it as the complete workflow. Priority is underspecified: the superpowers system says "process skills first" but doesn't clarify which process skill applies when all three have the same trigger.

Also overlapping: `design-layered-module` triggers on "any task that touches more than one file in a module" — conflicts in priority with `implement-feature` (both mandatory for multi-file changes).

### 3. Unenforceable Gates

| Skill | Gate | Unenforceable because |
|---|---|---|
| `decompose-tasks` §4 | "Does every behavior in the confirmed spec appear in at least one task's 'what to build'?" | Natural-language matching across two documents — no structural test |
| `decompose-tasks` §4 | "Have all FAILED patterns from AGENT_EXECUTION_LOG.md been noted in affected tasks?" | Relevance judgment required |
| `implement-feature` Rule 5 | "If you notice something broken outside your scope, flag it" | "Notice" is subjective |
| `write-spec` | "Written as observable outcomes, not implementation steps" | No test for whether a criterion is "observable" |
| `design-feature-notebook` | "At least 5 substantive stage cells" | "Substantive" requires judgment |

Well-enforced (mechanical): verify-checkpoint (explicitly excludes subjective gates), design-feature-notebook assertion count (≥3, countable), write-tests Rule 1 (greppable).

### 4. Staleness

**CRITICAL — All 18 skill reference paths in AGENTS.md are broken:**

AGENTS.md Skills Reference table (lines 527–544) references flat `.md` paths:
```
~/agent-governance/skills/core/discover-codebase.md     ← DOES NOT EXIST
```
Actual path format:
```
~/agent-governance/skills/core/discover-codebase/SKILL.md  ← EXISTS
```
The same broken format appears throughout AGENTS.md body (§1.5, §2, §4, workflow diagram, §5, §11). An agent following AGENTS.md to read a skill would receive a file-not-found error for every path in the document.

**AGENTS.md §1.5 and §16 — missing templates:**
- §1.5 line 100: "create it from the template in `~/agent-governance/templates/`" — templates exist only for `DOC_TAXONOMY.md` and `project-AGENTS.md`. No templates for `CODEBASE_MAP.md`, `SYSTEM_WORKFLOW_MAP.md`, `session_state.md`.
- §16 references `~/agent-governance/templates/AGENT_EXECUTION_LOG.md` — does not exist.

**`_original.md` backup files:** `design-layered-module/_original.md` and `design-feature-notebook/_original.md` still contain the old stale `write-notebook` reference. These are backup files (not active), but `ls` on the skills directory would surface them.

**`add-observability/SKILL.md`:** Uses `shastra_gaia.extraction.step_segmenter` as the logging example (lines 95–103) — project-specific, not a broken path but non-generic.

### 5. decompose-tasks Required Fields (Verbatim, §2)

```
Phase
Parallel group
Depends on
Model hint
Rate limit flag
Fallback model
Layer
File(s)
What to build
Function signatures (if applicable)
Input shape / output shape (if data-processing task)
Verify
Checkpoint
AGENT_EXECUTION_LOG notes
```

**Confirmed missing from current template:** No "complexity budget," no "max call depth," no "wrapper constraint" (re-export vs wrapper function decision), no "interface scope check" (if task adds exports to interfaces.py).

### 6. AGENTS.md Skill Reference Table Accuracy

**0/18 entries valid.** Every row uses a broken flat path format. (Full table omitted — all 18 rows fail the same way.)

---

## Phase 1 — Documentation Audit (Per-Project)

| File | CAD Design | CAD-Physics | Shastra |
|---|---|---|---|
| `docs/ai_context/DOC_TAXONOMY.md` | ✓ | ✓ | ✓ |
| `docs/ai_context/CODEBASE_MAP.md` | ✓ (1 stale ref: SKILLS.md) | ✓ (spot check only) | ✓ (visualization missing from Mermaid diagram) |
| `docs/ai_context/SYSTEM_WORKFLOW_MAP.md` | ✓ (updated 2026-06-15) | ✓ | ✓ |
| `docs/ai_context/AGENT_EXECUTION_LOG.md` | ✗ 43 commits, 0 entries | ✗ 9 commits, 0 entries | ✓ 22 commits, 37 entries |
| `docs/session_state.md` | ✓ (uncertain freshness) | ✓ (current) | ✓ (updated today) |
| `docs/specs/` has files | ✓ (non-standard structure) | ✗ (in docs/remediation/) | ✓ (4 files) |
| `docs/plans/` has files | ✗ (empty) | ✗ (in docs/remediation/) | ✓ (3 files) |
| `docs/tasks/` has files | ✗ (empty) | ✗ (in docs/remediation/) | ✓ (3 files) |
| Planning chain complete | ✗ | ✗ | ✓ |

**Key findings:**
- AGENT_EXECUTION_LOG is maintained only in Shastra.
- Full planning chain (specs→plans→tasks) is complete only in Shastra.
- CAD-Physics planning artifacts exist but in non-standard `docs/remediation/` — not discoverable by DOC_TAXONOMY conventions.
- CAD Design has specs organized as subdirectories (future/implementation/past), not the NNN_name.md convention.

---

## Phase 2 — Code Pattern Audit

| Check | CAD Design | CAD-Physics | Shastra | Systemic? |
|---|---|---|---|---|
| A — Lazy wrappers | 2 instances (assignment-form, code_graphs/interfaces.py) | Clean | 17+ (function-form, confirmed) | YES — Shastra (17+) |
| B — Call depth | Not checked | Not checked | Not checked | INSUFFICIENT DATA |
| C — Debug-era additions | Clean (fix commits → notebooks/config only) | Clean | 1 confirmed (llm/client.py) | NOT systemic |
| D — Project AGENTS.md | Lean/compliant root (55 lines) | 70 lines | 65 lines | OK all three |
| E — Boundary normalization | 172 isinstance-dict checks (flagged, not confirmed systemic) | Not checked | Not checked | INSUFFICIENT DATA |
| F — Silent exceptions | **SYSTEMIC: 7+ `except Exception: pass` across 5 modules** | Compliant (all 9 catches log + reraise) | Partial (needs deeper check) | YES — CAD Design |
| G — kwargs forwarding | Borderline (agent_langgraph/interfaces.py) | Justified (LLM connector) | Borderline | NOT systemic |
| H — Return contracts | Not systematically checked | Not checked | Consistent dict[str,Any] | INSUFFICIENT DATA |
| I — Interface scope | Kitchen-sink (code_graphs: 50+, 6 submodule families, infra mixed with domain) | Kitchen-sink (50+, 9 submodule families, schemas mixed with runners) | Large but more domain-coherent | YES — CAD Design, CAD-Physics |
| J — Acknowledged debt | NOT found (TODOs are dependency tracking or human-guidance, not workarounds) | NOT found | NOT found | NOT present |

**Detailed findings — Check F (CAD Design):**

| File | Line | Pattern |
|---|---|---|
| `prompt_evaluation/gt_reference.py` | 183 | `except Exception: pass` — DB query for image paths silently dropped |
| `metric_evaluation/evaluation/topology.py` | 31 | `except Exception: pass` |
| `agent_langgraph/traces/llm_call_recorder.py` | 18 | `except Exception: pass` |
| `code_graphs/analysis.py` | 923 | `except Exception: pass` |
| `brep_trajectory/incremental_executor.py` | 168 | `except Exception: pass` |
| `brep_trajectory/core/introspection.py` | 42 | `except Exception: pass` |
| `brep_trajectory/core/incremental_execution.py` | 174 | `except Exception: pass` |

All are direct violations of AGENTS.md §9, which already forbids this. Rule exists; enforcement doesn't.

---

## Phase 3 — Test Compliance

| Metric | CAD Design | CAD-Physics | Shastra |
|---|---|---|---|
| Test files | 3 | 21 | 4 |
| Test functions | 18 | ~200 est. | 84 |
| Behavioral tests present | ✗ (structural only) | ✓ | ✓ |
| Public interface imports only | ✓ | ✓ | ✗ VIOLATED |
| External services mocked | N/A | ✓ (77 mock usages) | ✓ |
| Last known pytest result | Unknown | Unknown | ✓ 52 passed |

**Critical violations:**
- **CAD Design:** 17 modules with ZERO behavioral tests. Only importability and retirement-contamination tests exist.
- **Shastra `test_gaia_trace_to_graph.py`:** Direct imports from 6 internal modules including private functions (`_compute_capability_overlap`, `_build_deterministic_canonical_tdg`). Violates write-tests Rule 1.

---

## Phase 4 — Notebook Compliance (SAMPLED)

**Sampling note:** CAD Design sampled 3 of 82; CAD-Physics sampled 4 of 15; Shastra sampled 3 of 18. Not exhaustive.

| Project | Avg sections/10 | Layer 1 violations | Core/internal imports | Assertions present |
|---|---|---|---|---|
| CAD Design | 5/10 | None found | None found | 2/3 samples |
| CAD-Physics | 3/10 | None found | None found | 3/4 samples |
| Shastra | 5/10 | None found | None found | 3/3 samples |

**Universally absent sections:** Purpose (formal), Test Inputs, Public Entry Point Check (as formal section), Edge/Failure Case, Debugging Notes.

**Root cause:** Notebooks across all projects were created for different purposes (analysis, workflow execution, pipeline audit) than the feature-inspection purpose the skill targets. All notebooks are functional and avoid production logic — they just don't follow the formal 10-section structure.

---

## Phase 5 — Task Specificity vs. Defect Rate

**Task files present only in Shastra** (3 files). CAD Design and CAD-Physics have no task files at standard paths — code was written without traceable planning.

**Task specificity ratings:**

| Task | Required fields present | Interface design decision explicit? | Defect in code? |
|---|---|---|---|
| 000 (observability) | 7/14 | N/A | Cannot assess (not implemented) |
| 005 (session wrappers) | 8/14 | NO — said "wrappers" without specifying form | YES — 17+ lazy wrappers |
| 006 (refactor) | 12/14 | N/A (refactor) | None found |

**The causal case:** Task 005, Phase 2 said "Add shared-session wrappers." Git commit `f00bd8c` added 17 function-form delegation wrappers to interfaces.py. If the task had said "add as direct re-export/import alias, not a wrapper function," the defect would not have occurred. One word ("wrappers" vs "re-export") in the task spec determined the architecture of 17 interface functions.

**Answer to the open question:** Evidence supports a split approach — NOT rule-only AND NOT task-detail-only. Both layers are needed: (b)-category defects need mechanical execution rules; (a/c)-category defects need task-level interface design decisions.

---

## Phase 6 — Defect Classification

| Category | Count | Defects |
|---|---|---|
| **(a) Planning-preventable** | 2 | CAD Design code_graphs kitchen-sink interface; CAD-Physics kitchen-sink interface |
| **(b) Rule-preventable** | 5 | CAD Design lazy wrapper `__all__` duplication; 7+ silent exception swallows; Shastra test internal imports; broken skill reference paths in AGENTS.md; design-feature-notebook internal contradiction |
| **(c) Both** | 1 | Shastra 17+ function-form lazy wrappers |
| **(d) Neither (process gap)** | 3 | CAD Design no task files; CAD-Physics non-standard planning paths; AGENT_EXECUTION_LOG not maintained |

**Investment implications:**
- (b) is heaviest: 5 defects from rules that mostly already exist but aren't enforced. Biggest win = add mechanical checks to the sequential execution prompt, not just to AGENTS.md.
- (d) is second: 3 process gaps require structural changes (pre-flight checks, not rule additions).
- (a) + (c) = 3 defects — smaller count argues against making tasks ultra-granular as the primary fix. Rules are more leveraged.

---

## Master Summary — All Confirmed-Systemic Issues (Ranked)

| Rank | Issue | Projects | Severity | Phase |
|---|---|---|---|---|
| 1 | ALL 18 skill reference paths in AGENTS.md are broken (flat .md format) | All (global) | Critical — agents can't read skills | 0 |
| 2 | AGENT_EXECUTION_LOG not maintained in CAD Design or CAD-Physics (43 and 9 commits, 0 real entries) | CAD Design, CAD-Physics | High | 1 |
| 3 | Silent `except Exception: pass` — 7+ instances across 5 modules | CAD Design | High (AGENTS.md §9 violation) | 2-F |
| 4 | 17+ function-form lazy wrappers in Shastra interfaces.py | Shastra | High — inflates public surface, confuses callers | 2-A, 5 |
| 5 | Zero behavioral tests for 17 modules in CAD Design | CAD Design | High | 3 |
| 6 | CAD Design and CAD-Physics developed without formal task files | CAD Design, CAD-Physics | High (planning protocol not followed) | 1, 5 |
| 7 | Shastra test_gaia_trace_to_graph.py imports from 6 internal modules (incl. private functions) | Shastra | Medium | 3 |
| 8 | Kitchen-sink interfaces: 50+ exports mixing unrelated concerns (CAD Design code_graphs, CAD-Physics interfaces.py) | CAD Design, CAD-Physics | Medium | 2-I |
| 9 | decompose-tasks task template missing wrapper/interface-form constraint field | All (global) | Medium (directly caused defect #4) | 0, 5 |
| 10 | CAD-Physics planning artifacts in non-standard docs/remediation/ | CAD-Physics | Medium | 1 |
| 11 | No templates for CODEBASE_MAP, SYSTEM_WORKFLOW_MAP, AGENT_EXECUTION_LOG in ~/agent-governance/templates/ | All (global) | Low | 0 |
| 12 | design-feature-notebook internal contradiction: DEBUG vs INFO level | All (global) | Low | 0, 6 |
| 13 | Notebooks across all projects miss 5–7 of 10 required sections | All | Low-Medium | 4 |
| 14 | `_original.md` backup files visible in skills directories | All (global) | Info | 0 |

---

## Recommended Next Actions (Ranked by Leverage)

| Priority | Action | Governance file | Effort |
|---|---|---|---|
| 1 | Fix all 18 skill reference paths in AGENTS.md (flat .md → SKILL.md/subdir format) | `~/agent-governance/AGENTS.md` | Low (find-replace) |
| 2 | Add "no single-call delegation wrapper" to AGENTS.md §9 Forbidden Patterns; add mechanical verify step in decompose-tasks for any task touching interfaces.py | `AGENTS.md §9`, `decompose-tasks/SKILL.md` | Low-Medium |
| 3 | Add "no `except Exception: pass`" as a SPECIFIC forbidden pattern with an example in AGENTS.md §9 (current rule is there but too abstract to enforce) | `AGENTS.md §9` | Low |
| 4 | Add session-start pre-flight check to sequential execution prompt: verify docs/tasks/ non-empty before writing any code | `decompose-tasks/SKILL.md §6` (execution prompt template) | Medium |
| 5 | Add explicit "wrapper vs. re-export" decision field to decompose-tasks §2 task template for interface-touching tasks | `decompose-tasks/SKILL.md §2` | Low |
| 6 | Create missing templates for CODEBASE_MAP, SYSTEM_WORKFLOW_MAP, AGENT_EXECUTION_LOG in ~/agent-governance/templates/ | `~/agent-governance/templates/` | Medium |
| 7 | Establish Shastra as the governance compliance reference; communicate CAD Design and CAD-Physics as needing a catch-up pass | Process | None |
| 8 | Fix design-feature-notebook checklist: change "INFO level" to "DEBUG level" to match Section 2 template | `design-feature-notebook/SKILL.md` | Trivial |
| 9 | Add write-tests mechanical gate: "grep -r 'from <package_name>\.' tests/ | grep -v interfaces" as a verify command for test phases | `write-tests/SKILL.md`, `decompose-tasks/SKILL.md` | Low |
| 10 | Delete `_original.md` backup files from skills directories | `skills/core/*/` | Trivial |
