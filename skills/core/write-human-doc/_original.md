---
name: write-human-doc
description: Use when creating or updating documentation in `docs/human_docs/` for human readers — after building or significantly changing a feature or module. Use this whenever a human needs to understand how to run, debug, or navigate the system. Human docs go stale fast; update them in the same session as the implementation.
---

# Write Human Doc

Human docs exist for people who understand the domain but haven't read the code. Write for that reader: behavior and intent, not implementation details.

## Output Location

`docs/human_docs/<doc_name>.md`

## Required Documents to Maintain

| File | Purpose |
|------|---------|
| `system_overview.md` | What the system does, what problem it solves, and how the pieces fit together |
| `how_to_run.md` | End-to-end instructions to run the system from scratch |
| `how_to_debug.md` | Common failure modes, how to inspect them, where to look |
| `module_guides/<module>.md` | Per-module human guide when complexity warrants it |

## Document Format

```markdown
# <Document Title>
**Last updated:** YYYY-MM-DD

## What this document covers
One sentence.

## Overview
Short prose. What a human needs to understand before reading further.

## <Section per topic>
...

## Common mistakes / gotchas
What trips people up with this system or module.

## How to verify it is working
Concrete commands, notebook sections, or outputs to check.
```

## Rules

- Do not copy internal implementation details — describe behavior and intent.
- Keep it short enough that someone actually reads it. Long docs go unread.
- Update this document whenever the behavior or workflow it describes changes.
