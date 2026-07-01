---
name: deprecate-code
description: Use when removing, replacing, or retiring any file, module, function, or class — before deleting or overwriting. Always use this skill when any code is being moved to archive or made obsolete. Skipping this process risks leaving dangling imports and losing recovery options.
---

# Deprecate Code

Never delete code in place. Archive it with a traceable header first.

## Steps

1. Confirm the code is no longer needed or has been fully replaced by the new implementation.
2. Search the entire codebase for any remaining imports or references to the deprecated path. Fix all of them before archiving — archived code must not be imported anywhere.
3. Move the deprecated file to `archive/<YYYY-MM>/<original_relative_path>`.
   - Example: `archive/2025-06/module_a/old_parser.py`
4. Add a header comment to the archived file:

```python
# ARCHIVED: YYYY-MM-DD
# Reason: <why deprecated>
# Replaced by: <path to new implementation>
# Safe to delete after: YYYY-MM-DD (or "when confirmed stable")
```

5. Update `docs/ai_context/CODEBASE_MAP.md` to remove the deprecated module/file.
6. Update the relevant module `README.md` if entry points changed.
7. Deletion from `archive/` is allowed only when:
   - The replacement has been validated in production.
   - No imports reference the archived path.
   - At least one full working session has passed without issues.
