# How to Debug Common Failures
**Last updated:** 2026-10-22

## What this document covers
Where to look when a governance check, Pi job, or bundled plugin workflow fails.

## Overview

Start with the exact failing command and its output. Identify whether the problem is in the shared rules, the repository's local configuration, a coding-agent runtime, or the Codex/Pi plugin. Do not infer success from a generated summary when raw command output is available.

## Governance self-check

Run from the repository root:

```bash
python3 tools/governance_selfcheck.py
```

The tool prints each finding and exits nonzero when it finds issues. Check the named rule file, `templates/ruff.toml`, `docs/session_state.md`, or active directory paths referenced by that finding. The check is intentionally limited; a clean result is not proof that every governance rule is satisfied.

## Python tests

Run:

```bash
python3 -m pytest tests/ -q
```

If the command cannot import `pytest` or `yaml`, the Python test dependencies are missing from the active environment. Use a virtual environment and install `pytest` and `PyYAML`; there is no root `requirements.txt` or `pyproject.toml` in this repository.

For a failing test, inspect the test and its target utility/config first. Do not weaken a guard just to make it pass without understanding the reported condition.

## Complexity-budget check

The checker needs a valid Git diff range and a non-negative integer budget. Example:

```bash
python3 tools/check_complexity_budget.py --repo . --range origin/main..HEAD --budget 5
```

- Exit `0`: budget passed.
- Exit `1`: added function/class declarations exceed budget.
- Exit `2`: usage or Git diff error.

Preserve the emitted `COMPLEXITY_BUDGET: ...` line verbatim when a task's rules require it.

## Pi controller

The controller requires `PI_MODEL`. If it exits with `PI_MODEL env var is required`, configure that variable using the intended role from `config/models.yaml`. Then run the controller's `setup` check and inspect the recorded job artifacts under `.agent_runs/pi/<job_id>/` (ignored by Git).

For a job, inspect `status.json`, `stream.log`, `stdout.log`, `stderr.log`, `questions.jsonl`, `git_diff.patch`, and `verify.log`. A no-output warning does not kill the process; use the status and diagnostic files to decide whether to wait or cancel. The controller records work but does not decide whether the task is correct.

## Claude Code / Codex plugin

Run `npm test` from `codex-plugin-cc/`. For the plugin's setup, command behavior, and background jobs, follow [`../../codex-plugin-cc/README.md`](../../codex-plugin-cc/README.md). Keep the failure output and job ID when reporting an issue; do not include credentials or private logs in a public report.

## Common mistakes / gotchas

- A passing self-check only covers the checks implemented in that script.
- A worker's success message is not independent verification.
- Do not use `git reset --hard` or clean generated files to resolve a test failure without human approval.
- Never paste tokens or API keys into an issue, test fixture, or execution log.

## How to verify the fix

Re-run the exact failing command after the smallest correction. Record the actual exit status and relevant output in the task's execution record. If the cause remains unclear after two focused attempts, stop and report evidence instead of guessing.
