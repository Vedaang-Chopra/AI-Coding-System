---
name: create-module
description: Use when creating a new module or major subdirectory that does not yet exist — before creating any directories or files. Always use this skill when the task involves scaffolding a new module, package, or feature directory, even if the structure seems obvious. Creating modules without this process leads to missing interface layers and broken ownership.
---

# Create Module

Before creating anything, confirm via `discover-codebase` that this module doesn't duplicate an existing one.

## Steps

1. Run the `discover-codebase` skill. Confirm no existing module already owns this behavior.
2. Define the module's single responsibility in one sentence before creating any files. If you can't do this, the module boundary is unclear — stop and clarify.
3. Create the directory with this base structure:

```
module_name/
  README.md
  interfaces.py    # public entry points only — what external consumers import
  runners.py       # workflow orchestration — calls core functions in sequence
  schemas/
  core/
  utils/
```

4. Write `README.md` using the `write-module-readme` skill.
5. Define the public interface in `interfaces.py`: what external consumers are allowed to import from this module. Keep internal files private — consumers should never import from `core/` directly.
6. Add the module to `docs/ai_context/CODEBASE_MAP.md` using the `update-codebase-map` skill.
7. If any logic in the new module is reusable across other modules, extract it to the project-level `utils/` immediately — do not wait for a refactor later.
