---
name: discover-codebase
description: Use before writing any new code or creating any new file. Always run this first when starting any task — read CODEBASE_MAP.md, module READMEs, and identify existing implementations before proposing or making any changes. Use this even when the task seems straightforward — skipping discovery is the leading cause of duplicate logic and wrong module placement.
---

# Discover Codebase

Before writing anything, understand what already exists. The goal is to answer six questions explicitly before touching a file.

## Steps

1. Read `docs/ai_context/CODEBASE_MAP.md` — understand module ownership, structure, and public APIs.
2. List all top-level directories. Confirm their stated responsibilities match what you expect.
3. For each module your task will touch, read its local `README.md`.
4. Identify existing functions, classes, and entry points related to your task by name and concept.
5. Search for similar functionality across the codebase — by function name, class name, and conceptual synonym.
6. Answer all six questions explicitly before writing anything:
   - Does similar functionality already exist?
   - Which module owns the behavior I need to implement?
   - Can I extend or update existing code instead of creating new files?
   - Is the logic specific to one module, or shared across many?
   - Which files will my change affect?
   - Are there existing tests or notebooks that cover the area I'm changing?

State your findings. Do not skip directly to implementation — this step is a precondition, not optional context.
