# Addendum — Generated-Code Sampling Findings (CAD Design + Shastra)
**Date:** 2026-08-23
**Feeds:** `docs/plans/governance_remediation_plan_2026-08-23.md` (WS2 calibration, WS5 evidence)
**Method:** direct read + scripted metrics on recent generated files (CAD 020-series/repair work, Shastra GAIA corpus-analysis work). Read-only.

---

## Samples inspected

| File | Size | Typed defs | Docstrings | Logger | Silent excepts |
|---|---|---|---|---|---|
| CAD `agent_langgraph/prompts/structured_repair_prompt.py` | 139L | 4/4 | ~5 | no* | 0 |
| CAD `agent_langgraph/repair/evidence.py` | 448L | 14/14 | ~4 | yes | 1 borderline |
| SHA `corpus_analysis/common/analysis.py` | 171L | 7/7 | 7 | yes | 0 |
| SHA `corpus_analysis/common/loaders.py` | 83L | 7/7 | 9 | yes | 0 |
| SHA `corpus_analysis/common/reuse_metrics.py` | 94L | 6/6 | 6 | yes | 0 |
| SHA `corpus_analysis/common/config.py` | 20L | 0 | 1 | n/a | 0 |

## What the skills ARE producing (working)

1. **Type hints: 38/38 public defs typed across all samples.** The AGENTS.md §10 rule is being followed.
2. **Docstrings present in every function-bearing file.**
3. **Logging discipline holding:** module loggers, zero `print()` in production files.
4. **No silent exception swallows.** One borderline: `evidence.py:136` catches `(TypeError, ValueError): continue` inside a display-formatting loop — specific types, deliberate skip of unformattable metric values. Technically compliant with the "specific type + explicit handled case" canon; not a violation, but the kind of case the WS2 checker should whitelist explicitly rather than leave to judgment.
5. **Layer boundaries respected in samples:** notebook-common modules import no internals; `evidence.py` imports only its own sibling schema.
6. **Notebook+Python mirror rule IS being followed in Shastra GAIA:** 5/5 numbered notebooks have `.py` mirrors plus dedicated test files (`test_analysis_notebooks.py`, etc.). CAD has central integration tests for the major families (`tests/integration/test_*_integration.py`, 5 files).
7. **Longest functions 18–88 lines** — none pathological.

## What the skills are NOT producing (failures)

1. **Formatting variance confirmed (WS2 justification):**
   - Line-length inconsistency: `analysis.py` has 24 lines >100 chars; `loaders.py` has 2. No project owns a formatter config except Shastra gaia's bare `pyproject.toml`. **Neither codebase nor governance defines line length, quote style, or import order mechanically.**
   - Quote-style drift exists (CAD evidence mixes single/double across 9 vs 170 lines).
   - Conclusion: cross-model consistency cannot come from prose rules — it needs the ruff gate exactly as WS2 specifies. Both codebases would need a one-time `ruff format` pass (line-length 100 recommended given existing density) plus committed config.
2. **A stray duplicate artifact:** `03_question_workflow_clustering copy.ipynb` sits in the GAIA notebooks dir — a manual copy violating "no version-suffix/copy files" hygiene. Small, but it's the exact class of debris that accretes without a closing check.
3. **CAD prompt file has no logger** (prompts layer — arguably fine), but `structured_repair_prompt.py` builds strings with f-strings at import scope in places — acceptable, noted for completeness.
4. **No formatter/lint config anywhere in CAD Design** (explicitly documented in its own AGENTS.md §4: "There is no project dependency manifest") — meaning even dependency hygiene is untracked. WS2 must include adding pyproject/ruff config per project, not just running the tool.

## Calibration decisions for WS2

- ruff `line-length = 100` fits both codebases' existing density (fewer than 30 long lines per file, mostly tables/comments).
- Whitelist pattern for the checker: `except (TypeError, ValueError): continue` inside pure-display formatting loops is acceptable if commented; silent swallows of broad `Exception` remain hard-fail.
- Per-project ruff config must live in each repo root (CAD Design/code_base currently lacks ANY manifest — add minimal pyproject).

## Net verdict

The execution models are following the *semantic* rules well (types, logging, layers, mirrors) because those rules are concrete and repeated everywhere they look. They are failing only at what no rule covers mechanically: formatting uniformity, artifact hygiene, and post-hoc verification of budgets/reports. This validates the plan's core thesis — fix enforcement machinery (WS2/WS3/WS6), don't add more prose rules.
