# How to Run Checks and Workflows
**Last updated:** 2026-10-22

## What this document covers
How to validate this repository and how to use its governance workflow in a project.

## Overview

The governance rules and skills are files loaded by coding-agent tools; this repository does not have a single command that starts the whole system. Run the relevant checks directly and configure each agent to read the appropriate instructions.

## Validate the governance repository

From the repository root:

```bash
python3 tools/governance_selfcheck.py
python3 -m pytest tests/ -q
```

The Python test suite needs `pytest` and `PyYAML`. There is no root dependency manifest at present, so install them in a project-local virtual environment or another isolated environment before running the suite.

For the bundled plugin, set `PI_MODEL` to the fast-code model configured in `config/models.yaml`, then run:

```bash
cd codex-plugin-cc
export PI_MODEL="<configured-model-id>"
npm test
```

The package declares Node.js `>=18.18.0`. For TypeScript builds, see the plugin README and package scripts; the build step also invokes the installed Codex CLI to generate app-server types.

## Use the governance workflow in another project

1. Make the shared governance repository available at the path your rules reference (the examples use `~/agent-governance`).
2. Configure planning agents to read `AGENTS.md` and `AGENTS.planning.md`; configure Pi execution to read `AGENTS.md` and `AGENTS.execution.md`.
3. Copy `templates/project-AGENTS.md` into the target project, replace the placeholders, and keep only project-specific constraints there.
4. Read the target project's own instructions and documentation before planning any change.
5. Follow the approval gates in `AGENTS.planning.md`: discovery → spec → plan → tasks → execution.
6. Run the checks listed in the approved task/checkpoint. Record literal command outcomes where required.
7. Update the project maps, docs, session state, and execution log after the task.

The Pi-specific run guide is [`../ai_context/pi_agent_tooling_guide.md`](../ai_context/pi_agent_tooling_guide.md). Plugin installation instructions are in [`../../codex-plugin-cc/README.md`](../../codex-plugin-cc/README.md).

## Common mistakes / gotchas

- Do not assume installing this repository configures Claude Code, Codex, or Pi automatically.
- Do not rely on a model ID hardcoded in an instruction; use the configured role and registry.
- The Pi controller requires `PI_MODEL` in its environment. Use the role mapping in `config/models.yaml` to choose the intended value, and do not put credentials in the environment file committed to Git.
- The plugin's TypeScript build has a Codex CLI generation prerequisite; the Node test command is separate.

## How to verify it is working

- The self-check prints `GOVERNANCE_SELFCHECK: PASS (0 findings)` when its checks pass.
- The Python suite exits 0 when its tests pass.
- The plugin test suite exits 0 when its Node tests pass.
- For a governed project, verify that the agent read the intended rule files and that each task's explicit verification command ran.
