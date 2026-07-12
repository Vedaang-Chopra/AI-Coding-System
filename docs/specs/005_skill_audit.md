# Spec: Skill Audit for Redundancy and Bloat
**ID:** 005
**Status:** Draft
**Source brief:** `docs/tasks/governance_brief_skill_audit.md`

## Purpose

Audit the full skill library (`~/agent-governance/skills/`) for overlapping
triggers, duplicated rule text, length outliers, and mergeable-without-loss
pairs — per the brief. This document is the **audit report + change list**
required by the brief. It contains no executed merges or archives. **HARD
STOP: no file changes happen until the human reviews this spec.**

## Affected Modules

- `~/agent-governance/skills/core/` (26 skills, all read in full)
- `~/agent-governance/skills/utility/` (6 skills, read in full)
- `~/agent-governance/skills/optional/mcp-graph/` (5 skills, read in full)
- `~/agent-governance/SYSTEM_OVERVIEW.md` §8/§9 (drift found, update deferred to post-approval)
- `~/agent-governance/AGENTS.md` (one bug found during required full read; flagged, not fixed — outside this pass's edit authority)

## Out of Scope

- No skill content was edited, merged, or archived in this pass.
- No new skills created (forbidden by brief).
- `AGENTS.md` / `AGENTS.planning.md` / `AGENTS.execution.md` body content — only skill-reference tables/paths may be touched, and only if a future approved merge/archive requires it.
- User-level skills: none exist (`~/.claude/skills/` is empty). Not audited further.
- Claude Code global plugin skills (`superpowers:*`, `claude-mem:*`, top-level `caveman:*`, etc.) — these are not part of `~/agent-governance/skills/`, out of scope for this repo-scoped audit.

---

## Step 1–3 Compliance Note

Read in full: `AGENTS.md`, `SYSTEM_OVERVIEW.md`, all 26 core `SKILL.md` files,
all 6 utility `SKILL.md` files, all 5 optional (`mcp-graph/`) `SKILL.md`
files — 37 skill files total, zero skipped. (Note: `AGENTS.md` and
`SYSTEM_OVERVIEW.md` are wrapped by a claude-mem memory hook that truncates
the standard `Read` tool to a one-line summary once a file has prior
observations; both were read in full via `cat` through the `Bash` tool
instead, to satisfy the brief's "read fully" requirement.)

---

## Part A — Disk vs. Documentation Drift (separate from redundancy audit, per brief)

| ID | Finding | Detail |
|---|---|---|
| D1 | `execute-tasks-with-pi` undocumented in §8 | Exists on disk (core, 292 lines), actively cross-referenced by name twice inside SYSTEM_OVERVIEW.md's own `plan-pi-execution` entry and required by `AGENTS.planning.md`'s conditional skill table — but has **no dedicated `### execute-tasks-with-pi` entry** in SYSTEM_OVERVIEW.md §8. Header itself reads "Core Skills (25)" — stale, actual on-disk core count is **26**. |
| D2 | "library of 30 skills" is stale | SYSTEM_OVERVIEW.md line 32 states the system has "a library of 30 skills." Actual on-disk count: 26 core + 6 utility + 5 optional = **37** (or 32 if optional is deliberately excluded from this figure — ambiguous, see Open Questions). |
| D3 | Optional tier entirely undocumented | `skills/optional/mcp-graph/*` (5 files) have zero mention anywhere in SYSTEM_OVERVIEW.md — no section, no acknowledgment an "optional" tier exists, despite the brief itself describing the skill set as "24 core + 6 utility) plus optional and user skills." |
| D4 | Broken sentence in `AGENTS.md` | Line 92: `**Skills are individual .md files in . See AGENTS.planning.md or AGENTS.execution.md for the relevant skill reference table.**` — the path after "in" is missing, leaving a bare period. Reads as a remnant of the historical flat-path bug this brief's own Purpose section references. Flagged only; fixing it is outside this pass's granted edit authority over `AGENTS.md` (limited to skill-reference tables/paths tied to an approved merge/archive). |
| D5 | Dangling skill reference | `skills/utility/diagnose/SKILL.md` (final line) tells the reader to "hand off to the `/improve-codebase-architecture` skill" — no such skill exists anywhere in `~/agent-governance/skills/` (core, utility, or optional). |

---

## Part B — Redundancy / Bloat Audit Report (every skill, one line each)

### Core (26)

| Skill | Classification | Reasoning |
|---|---|---|
| `add-observability` | clean (long, justified) | 490 lines but sole owner of the two-layer observability model; no restated content elsewhere. |
| `create-module` | clean | Thin scaffolding checklist; correctly delegates to `discover-codebase`, `write-module-readme`, `update-codebase-map` rather than restating them. |
| `decompose-tasks` | clean | Canonical owner of the phase-sizing rule and Type A/B decision (confirmed post-spec-004); correctly pointed-to, not restated, by `write-plan`, `plan-pi-execution`, `verify-checkpoint`. |
| `deprecate-code` | clean | Sole owner of the archive pattern; no overlap found. |
| `design-feature-notebook` | clean (long, justified) | 436 lines, two modes (post-spec-004); sole owner of notebook structure rules. |
| `design-layered-module` | soft overlap (informational) | Tier 2 restates "`run_full_pipeline()` is a call list" — same rule `design-runner` owns in depth. See `design-runner` row; no action recommended. |
| `design-python-code` | clean (long, justified) | 607 lines, the largest skill on disk. Covers 4 genuinely distinct sub-domains (class-vs-function, SOLID, composition, 4 named OOP patterns) each needing code examples for a small model to pattern-match. Splitting would improve focus but is barred by the brief's "no new skills" constraint — flagged as an open question, not actioned. |
| `design-runner` | soft overlap (informational) | 43 lines; the "`run_full_pipeline` = call list, no conditionals" rule is also present (briefly) in `design-layered-module` Tier 2 and in `AGENTS.md`/`SYSTEM_OVERVIEW.md`'s forbidden-patterns list. Genuinely small file with a narrow, common trigger (editing any `runners.py`) — merging into `design-layered-module` (394 lines) would force loading irrelevant content for that narrow trigger, which the brief's own mergeable-without-loss test argues against. No action recommended. |
| `discover-codebase` | clean | — |
| `execute-tasks-with-pi` | clean content; **doc drift** (see D1) | Content itself has no overlap — explicit Scope-and-Boundary table cleanly distinguishes it from `decompose-tasks` and `plan-pi-execution`. |
| `find-skills` | clean | Distinct from `write-a-skill` (install third-party vs. author first-party). Arguably miscategorized as core rather than utility (it's a meta/tooling skill, not a workflow-architecture skill like its 25 core siblings) — noted, not a formal finding under the brief's 4 criteria. |
| `handoff` | overlapping triggers (soft) | Both this and `handoff-coding-agent` trigger on "session ending" language. Distinguishable in practice (arbitrary chat vs. structured phase-based coding session) but neither file cross-references the other, so a smaller model reading both in isolation could pick the wrong one. Not mergeable-without-loss (different audiences, different output formats/locations) — recommend sharpening both descriptions to cross-reference each other, not merging. |
| `handoff-coding-agent` | overlapping triggers (soft) | See `handoff` row. |
| `implement-feature` | clean | Pure orchestrator; delegates every step, restates nothing. |
| `parallel-execution` | clean | — |
| `plan-pi-execution` | clean | Correctly points to `decompose-tasks`'s canonical phase-sizing rule rather than restating (confirmed post-spec-004 fix). |
| `refactor-module` | clean | — |
| `update-codebase-map` | **duplicated rule text** | §1 ("Mermaid Module Dependency Diagram... update this first") restates the same diagram, same location, same node/edge rules, and a near-identical example snippet found in `update-system-diagram` §1. See Part C, Finding F1. |
| `update-docs` | clean | Pure router/checklist; correctly delegates without restating. |
| `update-system-diagram` | **duplicated rule text**; internal inconsistency | See F1. Also: §1's own node-count threshold ("more than 12 nodes") contradicts this same file's later "Diagram Quality Rules" section ("more than 15 nodes") — an internal inconsistency within one file, noted alongside F1 since the fix touches the same section. |
| `verify-checkpoint` | clean | — |
| `write-human-doc` | clean | — |
| `write-module-readme` | clean | — |
| `write-plan` | clean | — |
| `write-spec` | clean | — |
| `write-tests` | clean | — |

### Utility (6)

| Skill | Classification | Reasoning |
|---|---|---|
| `caveman` | clean (aside noted) | No overlap with other skill files. Aside: this repo's `SessionStart:clear` hook injects a near-identical condensed rule set directly into the system prompt — a skill-vs-hook duplication, not a skill-vs-skill one, so outside this audit's file-level scope. Mentioned for awareness only. |
| `diagnose` | clean content; **dangling reference** (D5) | — |
| `grill-me` | **merge candidate — confident** | Its entire body (interview procedure) is restated near-verbatim inside `grill-with-docs`'s `<what-to-do>` block. See Part C, Finding F2. |
| `grill-with-docs` | **merge candidate — confident** | Strict superset of `grill-me`: same core procedure + additive CONTEXT.md/ADR layer that only activates when a domain model exists, i.e. it already degrades gracefully to `grill-me`'s exact behavior otherwise. See F2. |
| `teach` | clean | — |
| `write-a-skill` | clean | — |

### Optional — `mcp-graph/` (5)

| Skill | Classification | Reasoning |
|---|---|---|
| `debug-issue` | duplicated boilerplate (informational); possible orphan | Shares an identical 3-line "Token Efficiency Rules" footer with the other 3 `mcp-graph` skills (F3). Also depends on MCP tools (`get_minimal_context`, `query_graph`, etc.) that do not appear anywhere in this environment's available/deferred tool list — possible orphaned integration (F4). |
| `explore-codebase` | duplicated boilerplate; possible orphan | Same as above. |
| `refactor-safely` | duplicated boilerplate; possible orphan | Same as above. |
| `review-changes` | duplicated boilerplate; possible orphan | Same as above. |
| `codebase-design` | **misplaced — ambiguous** | Describes an unrelated project's folder layout (`dataset_creation/`, `cad_code_generation/`, `analytics/` — matches the "CAD Design" project referenced elsewhere in this repo's history, not agent-governance's own layer model). Contains zero `mcp-graph`/graph-tool references despite living inside the `mcp-graph/` directory. See F5. |

---

## Part C — Findings Requiring a Decision

### F1 — `update-codebase-map` / `update-system-diagram`: duplicated Mermaid-diagram instructions
**Confidence:** Confidently redundant (mechanical dedup, not a structural merge).
**What overlaps:** `update-codebase-map` §1 fully restates the CODEBASE_MAP.md module-dependency diagram's purpose, an example Mermaid snippet, and its node/edge rules — content that `update-system-diagram` §1 already owns (that skill's whole reason to exist is "Mermaid diagrams... must stay current," covering all three diagram locations, of which CODEBASE_MAP.md's is one).
**Recommended fix (not yet executed):** Trim `update-codebase-map` §1 down to a one-line pointer ("Update the diagram first — see `update-system-diagram` §1 for the CODEBASE_MAP.md diagram rules") and keep the rest of `update-codebase-map` (text-table sections 2–10) as the sole content. While there, resolve the internal 12-vs-15-node threshold inconsistency inside `update-system-diagram` by picking one number.
**Why flagged instead of executed:** the brief's Execution Authority section is framed around "merge or archive" a whole skill; this is a within-file content edit. Listed here so the human can approve it under the same authority (the Constraints section explicitly allows shortening a file to kill a duplicated rule).

### F2 — `grill-me` / `grill-with-docs`: near-verbatim duplicated interview procedure
**Confidence:** Confidently redundant on the duplicated text itself; the **resolution mechanism** is a judgment call, so flagging as ambiguous overall.
**What overlaps:** `grill-with-docs`'s `<what-to-do>` block is `grill-me`'s entire body, near word-for-word (one clause added: "waiting for feedback on each question before continuing"). `grill-with-docs` then layers CONTEXT.md/ADR-specific behavior on top, which only activates "if a `CONTEXT.md` exists" — meaning `grill-with-docs` already reproduces `grill-me`'s exact behavior when no domain model is present.
**Two possible resolutions (human should pick one):**
  1. Archive `grill-me` outright (`archive/2026-07/skills/utility/grill-me/`), fold its trigger phrase ("grill me on this") into `grill-with-docs`'s description, remove its SYSTEM_OVERVIEW §9 entry. Simplest — one skill instead of two.
  2. Keep both as separate triggers, but de-duplicate the text: `grill-with-docs`'s `<what-to-do>` references `grill-me`'s procedure instead of repeating it, adding only the CONTEXT.md-specific delta.
**Recommendation:** Option 1 — no observed loss, and the brief's own test ("no loss from merging") is satisfied. Not executed pending human sign-off since it changes a user-facing trigger surface.

### F3 — `mcp-graph/*`: duplicated "Token Efficiency Rules" footer (4 files)
**Confidence:** Confirmed duplication (identical 3-line block in `debug-issue`, `explore-codebase`, `refactor-safely`, `review-changes`).
**Why no action recommended:** the four skills are legitimately distinct procedures (debug / explore / refactor / review) — not a merge candidate. The clean fix (extract the shared footer to one file the four point to) would require creating a new file, which the brief explicitly forbids this pass. Flagged as informational; revisit in a future pass that's scoped to allow new files.

### F4 — `mcp-graph/*`: possible orphaned MCP integration
**Confidence:** Ambiguous — needs human confirmation, not something inferable from the repo alone.
**What was found:** `debug-issue`, `explore-codebase`, `refactor-safely`, `review-changes` all call tools (`semantic_search_nodes`, `query_graph`, `get_flow`, `detect_changes`, `get_impact_radius`, `get_minimal_context`, etc.) belonging to an MCP server named `code-review-graph`. No tool with that name or prefix appears anywhere in this session's available or deferred MCP tool list.
**Possible explanations:** (a) the MCP server is configured per-project and simply isn't attached to this session, (b) it's a discontinued integration, (c) these skills were written for/copied from a different project. Cannot distinguish from repo state alone.
**Recommendation:** human confirms whether `code-review-graph` is still an active MCP integration anywhere before any archive decision.

### F5 — `skills/optional/mcp-graph/codebase-design/SKILL.md`: misplaced, project-specific content
**Confidence:** Ambiguous.
**What was found:** Its Folder Responsibilities table (`dataset_creation/`, `code_generation/`, `cad_code_generation/`, `analytics/`) does not match agent-governance's own layer model (`interfaces.py`/`runners.py`/`core/`/`schemas/`) and instead matches what looks like the "CAD Design" project referenced elsewhere in this repo's history (`execute-tasks-with-pi/SKILL.md`'s worked example). It has zero `mcp-graph` MCP-tool references despite living inside the `mcp-graph/` directory, and `user-invocable: false` is set (unlike its four siblings).
**Recommendation:** human decides whether this belongs in the CAD Design project's own repo instead of the shared governance library, or whether it should stay as a template but be relocated out of `mcp-graph/` into its own directory. Not archived — insufficient context to call this "no loss."

---

## Acceptance Criteria

- [x] Every skill file on disk accounted for in the audit report (37/37 — Part B).
- [x] Disk-vs-doc drift reported separately from the redundancy audit (Part A).
- [ ] Human has reviewed this spec and indicated, per finding, one of: execute now / execute with modification / defer / reject.
- [ ] (Post-approval, not yet done) Approved merges/archives executed per `deprecate-code`'s archival pattern, all references fixed.
- [ ] (Post-approval, not yet done) `SYSTEM_OVERVIEW.md` §8/§9 updated to match the post-audit skill set exactly, including resolving D1–D3.

## Validation Plan

Once merges/archives are approved and executed:
1. Re-run the disk enumeration (`find skills -name SKILL.md`) and diff against the new SYSTEM_OVERVIEW.md §8/§9 — zero drift expected.
2. `grep` for the archived skills' names across `AGENTS.md`, `AGENTS.planning.md`, `AGENTS.execution.md`, `SYSTEM_OVERVIEW.md`, and all remaining `SKILL.md` files — zero remaining references outside the archive header itself.
3. Confirm every archived file exists under `archive/YYYY-MM/<original_path>` with the required header (ARCHIVED / Reason / Replaced by / Safe to delete after).
4. Re-read `update-codebase-map` and `update-system-diagram` (if F1 is approved) to confirm the CODEBASE_MAP.md diagram rule now appears in exactly one file.

## Known Risks / Open Questions

1. **D2/D3 resolution:** should the "library of N skills" figure in SYSTEM_OVERVIEW.md include `optional/`, or is optional intentionally excluded from that count and from §8/§9 entirely (e.g., because it's per-project, opt-in tooling rather than universal governance)? Blocks how §8/§9 get rewritten post-approval.
2. **F2 resolution:** archive `grill-me` outright, or de-duplicate text while keeping both triggers? (Recommendation given above; needs explicit sign-off since it's user-facing.)
3. **F4:** is `code-review-graph` MCP server still in active use anywhere? Determines whether F4/F5 become archive candidates in a follow-up pass.
4. **design-python-code length (607 lines):** flagged as justified-but-large under this pass's "no new skills" constraint. If the human disagrees and wants it split, that is explicitly out of scope for this pass and would need its own brief.
