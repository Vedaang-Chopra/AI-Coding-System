---
name: handoff
description: >
  Use when the user asks to create a handoff document, wrap up a long chat, or
  prepare context for a new session. Triggers: create a handoff, this chat is
  getting too long, summarize for next session, write a handoff doc, prepare
  context for a new chat, or similar.
---

# Handoff

## Overview
Create a concise handoff document from the current conversation so a fresh agent/session can continue work without re-reading the full chat.

## Step 1 — Understand the focus
If user passed an argument, treat it as next session's primary focus. Otherwise infer from conversation: most active thread, what is unresolved, direction of work.

## Step 2 — Extract the right information

**Prioritize:**
- Confirmed decisions (not floated, not speculative)
- Current direction and approach
- Unresolved questions and blockers
- Concrete next actions
- Project-specific constraints, design choices, or terminology expensive to reconstruct
- Files, artifacts, or references already created

**Omit:**
- Widely known background or easily looked-up info
- Rejected or abandoned exploratory ideas
- Repetitive back-and-forth that led to an already-captured conclusion
- Speculation with no actionable consequence

## Step 3 — Write the handoff document

Template:

```markdown
# Handoff: <short topic>
**Date:** <YYYY-MM-DD>
**Next session focus:** <from argument, or inferred>

---

## What Was Being Discussed
One short paragraph. Problem or project, and why it matters. Orient a fresh agent.

## Decisions Made
Bullet list. Only confirmed decisions. Mark uncertain as `[uncertain]`.

## Current Direction
Approach being followed now. What has been ruled out. Working assumptions.

## Open Questions / Blockers
Real unresolved items only. If none, say so explicitly.

## Next Actions
Ordered checklist. What the next agent should do first.

## Files / Artifacts / References
Paths, URLs, PRs, commits, doc names. Do not paste content — reference only.

## Suggested Skills / Tools for Next Session
List only what is relevant:
- codebase search / repo inspection
- web search / documentation lookup
- memory update / project planning
- terminal execution / bash
- notebook inspection / artifact generation
- specific skills by name if known

---

## Project Memory Update
**Instructions:** Copy bullets below into project memory. Only confirmed, stable, high-signal facts.

- <confirmed fact 1>
- <confirmed fact 2>

Keep short. No vague ideas, temporary context, or speculation.
```

## Step 4 — Save the file

- **macOS / Linux:** `/tmp/handoff_<topic>_<YYYYMMDD_HHMM>.md`
- **Windows:** `%TEMP%\handoff_<topic>_<YYYYMMDD_HHMM>.md`

Short descriptive topic slug (e.g., `shastra_orchestrator`, `auth_refactor`).

If file save fails: print full markdown inline and state file could not be saved.

## Step 5 — Confirm to user

```
Handoff saved: <path>

Next session focus: <focus>
Memory update candidates are at the bottom of the file — copy them into project memory before closing this session.
```

If printed inline:
```
File save failed — handoff printed above.

Memory update candidates are at the bottom — copy them into project memory before closing this session.
```

## Rules
- Compact but not vague. Reader orients in under 2 minutes.
- Only confirmed decisions in **Decisions Made**. Speculative = omitted or `[uncertain]`.
- Do not duplicate content in referenced artifacts — point by path/URL.
- **Project Memory Update** = stable, decided, reusable facts only. If nothing qualifies: "No new memory updates for this session."
- Redact API keys, passwords, tokens, PII. Note at bottom if redacted.
- If conversation covered multiple topics, focus on user-specified argument or most active unresolved thread.
- No chain-of-thought or internal reasoning — only conclusions and facts.

---

## Related Skills

* `SKILL: handoff-coding-agent` — use that skill instead, not this one, when
  the session being wrapped up is a structured coding-agent workflow with a
  `docs/tasks/<NNN>.md` phase breakdown in progress. It writes
  `docs/session_state.md` (always overwritten, resumed by the next agent
  automatically) rather than this skill's one-off `/tmp/handoff_*.md`. Use
  this skill (`handoff`) for general conversation wrap-up outside that
  structured workflow.
