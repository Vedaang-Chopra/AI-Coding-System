# Contributing

Thanks for taking an interest in AI-Coding-System. This is a personal governance system under active development; contributions should be focused, evidence-based, and consistent with the repository's documented boundaries.

## Before opening a change

1. Read `AGENTS.md` and the relevant role-specific rules.
2. Check `docs/ai_context/CODEBASE_MAP.md` and the relevant existing skills, templates, tests, or plugin docs before adding a parallel mechanism.
3. For a substantial behavior or workflow change, discuss the problem and intended scope first. Keep unrelated cleanups out of the same change.
4. Do not add model IDs to general rules when the role registry can remain in `config/models.yaml`.

## Change expectations

- Keep agent rules, reusable skill procedures, templates, implementation, and user-facing docs in their appropriate locations.
- State whether a proposed check is mechanically enforced or procedurally required; do not imply a written rule is automatically enforced.
- Keep examples runnable and paths current. Do not include credentials, private project data, or generated run artifacts.
- Preserve third-party license and notice files for bundled components.
- Do not add a root license or change licensing terms without maintainer approval.

## Local validation

Run the relevant checks before submitting:

```bash
python3 tools/governance_selfcheck.py
python3 -m pytest tests/ -q
```

For changes under `codex-plugin-cc/`, set `PI_MODEL` to the fast-code model configured in `config/models.yaml`, then run:

```bash
cd codex-plugin-cc
export PI_MODEL="<configured-model-id>"
npm test
```

Python tests require `pytest` and `PyYAML`; no root dependency manifest is currently provided. The plugin declares Node.js `>=18.18.0`.

Include the exact commands and outcomes in your pull request description. If a check was not run, say why. Do not report a check as passing based only on an agent's self-assessment.

## Pull requests

- Use a focused branch and a descriptive summary.
- Explain the problem, the smallest change that addresses it, and any tradeoffs.
- Include relevant tests or documentation updates.
- Link related issues or specs when available.
- Wait for maintainer review before merging.

## Licensing

There is no root-level license for this repository at present. Do not assume contributions to the root repository are licensed under the license of `codex-plugin-cc/`; ask the maintainer before submitting changes if that distinction affects your contribution.
