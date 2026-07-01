---
name: refactor-module
description: Use when cleaning up, reorganizing, or restructuring an existing module without adding new behavior. Use this skill whenever the task is structural improvement — renaming, deduplication, adding an interface layer, or reorganizing directories. Refactoring without a plan risks breaking imports, losing tests, and introducing unintended behavior changes.
---

# Refactor Module

Structural changes and logic changes are separate commits. Never mix them.

## Steps

1. Run the `discover-codebase` skill first. Do not refactor blind.
2. State explicitly what is structurally wrong: flat files, duplicate logic, bad naming, missing interface layer, etc.
3. Write a refactor plan before touching any code.
4. Refactor in this order — each step is a separate commit:
   - **Naming**: files, functions, classes
   - **Directory structure**: group by responsibility
   - **Interface layer**: add `interfaces.py` if missing, enforce that external callers only import from it
   - **Logic deduplication**: extract shared utilities to `utils/`
5. After each step, verify that existing tests and notebooks still run.
6. Move replaced or deprecated files to `archive/` using the `deprecate-code` skill.
7. Run the `update-docs` skill after refactor is complete.
