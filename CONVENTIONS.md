# Conventions

Code style standards for all governed projects. Global behavioral rules live in
`AGENTS.md`; this file holds the concrete style contract.

## Formatting

All Python code in governed projects is formatted with **ruff** using the
canonical config at `templates/ruff.toml`.

- **Line length: 100** (per the 2026-08-23 generated-code sampling addendum).
- Formatter: `ruff format .` — output must be byte-stable across models; any
  model-generated diff that changes formatting will be normalized by this tool.
- Linter: `ruff check .` must be green before a checkpoint Verify step passes.
- Projects copy `templates/ruff.toml` to their root unchanged. Do not fork
  values per project; propose changes to the template instead.

## Naming

See `AGENTS.md` §8 for the naming table (snake_case functions, PascalCase
classes, UPPER_SNAKE_CASE constants, forbidden version-suffix names).

## Imports

See `AGENTS.md` §7: standard library → third-party → internal, blank line
between groups, enforced by ruff's isort rules (`I`) in the canonical config.

## Forbidden patterns

See `AGENTS.md` §9 — lazy wrappers, silent exception swallows, dead code,
hardcoded paths/model names/credentials.
