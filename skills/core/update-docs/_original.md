---
name: update-docs
description: Use after any implementation that changes behavior, structure, public APIs, schemas, or configs. Always run this before finalizing any task — documentation updates belong in the same change set as the code, not as a follow-up. Use this even for small changes — a renamed function or moved file is a documentation event.
---

# Update Docs

Documentation that lags behind the code becomes a liability. Update everything in the same change set as the implementation.

## Checklist

Work through each question. Any "yes" triggers the corresponding action:

1. Did module structure change? → Update `docs/ai_context/CODEBASE_MAP.md` using the `update-codebase-map` skill.
2. Did public APIs change? → Update `interfaces.py` docstrings and the relevant spec in `docs/specs/`.
3. Did schemas or configs change? → Update the spec and `docs/ai_context/CODEBASE_MAP.md`.
4. Did module purpose or entry points change? → Update the local `README.md`.
5. Does the spec match the implementation? → If not, update the spec to reflect reality — specs describe what is, not what was planned.
6. Does `docs/human_docs/` need updating for human-facing system understanding? → Use the `write-human-doc` skill.

All of these happen in the same change set as the implementation, not after.
