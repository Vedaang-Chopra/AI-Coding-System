# System Overview
**Last updated:** 2026-10-22

## What this document covers
A human-readable view of the repository's purpose, components, and workflow.

## Overview

AI-Coding-System is a personal set of rules and tools for coordinating coding agents across repositories. It aims to make agent work easier to supervise by defining an ordered workflow, keeping changes scoped, requiring concrete verification, and preserving execution history. It is documentation-first: the rules describe expected behavior, while only a subset is checked mechanically.

## Main components

- **Rules:** `AGENTS.md` defines shared constraints; `AGENTS.planning.md` and `AGENTS.execution.md` define role-specific procedures.
- **Skills:** `skills/core/` contains reusable procedures for discovery, specification, planning, task decomposition, implementation, testing, and verification.
- **Templates/configuration:** `templates/` seeds project-specific docs; `config/models.yaml` centralizes model-role settings.
- **Checks:** `tools/governance_selfcheck.py` checks a limited set of repository conventions. `tools/check_complexity_budget.py` counts new function and class declarations in a selected Git diff range.
- **Plugin:** `codex-plugin-cc/` provides Claude Code commands that use the local Codex CLI/app server and the shared Pi controller.
- **Records:** `docs/specs/`, `docs/plans/`, `docs/tasks/`, `docs/audits/`, `docs/session_state.md`, and the execution log retain decisions and history.

## Workflow at a glance

1. Discover the relevant code and existing behavior.
2. Write and approve the specification.
3. Plan and approve the approach.
4. Decompose into bounded tasks with verification criteria.
5. Execute one approved task at a time.
6. Run checkpoint checks and record actual output.
7. Update documentation, maps, session state, and execution history.
8. Have a human review the diff and decide whether to accept it.

The workflow map lives in [`../ai_context/SYSTEM_WORKFLOW_MAP.md`](../ai_context/SYSTEM_WORKFLOW_MAP.md); repository structure is in [`../ai_context/CODEBASE_MAP.md`](../ai_context/CODEBASE_MAP.md).

## What it does not promise

- It is not a standalone AI agent runtime or universal installer.
- Written gates are not automatically enforced unless an executable check or hook exists.
- The project does not yet provide broad quantitative evidence that these practices improve outcomes across external users or repositories.
- No root-level license has been selected for the repository as a whole.

## Common mistakes / gotchas

- Do not treat the bundled Codex plugin's license as the license for all repository content.
- Do not assume every documented checkpoint is wired into an automatic blocker.
- Do not trust a worker's self-reported test result without checking the command output yourself.
- Keep role and model configuration references aligned with `config/models.yaml`.

## How to verify it is working

Run `python3 tools/governance_selfcheck.py`, the Python tests, and—when changing the plugin—`npm test` in `codex-plugin-cc/`. Then inspect the actual diff and confirm the required documentation and execution records were updated.
