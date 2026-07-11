# Governance Fix Brief — Skill Audit for Redundancy and Bloat
**Date:** 2026-07-11
**For:** Claude Code (implementation agent)
**Written by:** Human + Claude (planning session)
**Status:** Ready for inspection → spec → implementation

---

## Purpose

The skill system has grown to 30 skills (24 core + 6 utility) plus optional
and user skills. Two agents read these under real constraints: Claude Code
during planning, Pi (a smaller model) during execution. Every skill Pi might
load competes for context it doesn't have much of. This is not a one-time
cleanup — it's a standing concern: this system has bloated once before
(the flat-path bug that made the skill layer non-functional across 18
references was a symptom of the same underlying problem — too much surface
area, not enough enforcement that it stays coherent).

This brief authorizes a full audit for overlap, duplication, and length, with
authority to merge or archive skills that are confidently redundant, and to
flag ambiguous cases for review rather than deciding unilaterally.

---

## What Claude Code Must Do First

1. Read `~/agent-governance/AGENTS.md` and `~/agent-governance/SYSTEM_OVERVIEW.md`
   fully.
2. List every actual skill file on disk under `~/agent-governance/skills/`
   (core, utility, optional, user) and diff that list against what
   `SYSTEM_OVERVIEW.md` §8/§9 currently describes. Flag any drift — a skill
   that exists but isn't documented, or is documented but doesn't exist — as
   its own finding, separate from the redundancy audit below.
3. Read every core skill file in full. Skim utility/optional/user skills for
   the same checks — full audit priority is core, but don't skip the others.
4. Write a spec at `docs/specs/NNN_skill_audit.md` covering findings before
   making any file changes.
5. **HARD STOP after the spec — do not execute merges/archives until the
   human has reviewed the findings.** (This is different from the authority
   granted below — see "Execution Authority.")

---

## What Counts as a Finding

For each skill, check against every other skill for:

1. **Overlapping triggers.** Two skills whose "when to invoke" conditions
   fire on the same task shape — a model reading both wouldn't know which
   to follow, or would load both when one would do.
2. **Duplicated rule text.** The same rule, pattern, or example stated in
   more than one file. (This brief itself and the companion brief on phase
   checkpoints are written specifically to avoid creating new instances of
   this — check that their output didn't introduce any.)
3. **Length outliers.** Any `SKILL.md` that has grown well past what a
   single-purpose procedural skill needs — flag it even without a hard
   line count, using judgment: could a smaller model actually hold this in
   working context alongside a task, or does it read as several skills
   stitched together?
4. **Mergeable-without-loss.** Two skills that could become one without
   either losing its distinct triggering value — i.e., merging wouldn't
   force an agent to load irrelevant content to get the part it needs.

## What Does NOT Count as a Finding

- Two skills covering genuinely different decisions at different scopes
  (e.g., "which layer" vs. "how to design within a layer") are not
  redundant just because they're topically adjacent. Only flag if the
  triggers or content actually overlap, not because two skills sit near
  each other conceptually.
- Do not flag a skill as bloated solely because it's long — a skill can be
  long because its domain is genuinely large. Flag it because a smaller
  model would plausibly get confused or lose the actionable rule in noise.

---

## Execution Authority

- **Confidently redundant** (clear duplication, no loss from merging):
  Claude Code may execute the merge/archive directly, following the
  `deprecate-code` skill's archival pattern (`archive/YYYY-MM/<path>` with
  header, never in-place deletion) and fixing all references.
- **Ambiguous** (real judgment call, meaningful content might be lost, or
  triggers only partially overlap): flag with reasoning in the spec, do not
  execute, wait for human decision.
- All merges/archives — confident or not — must be listed in the spec before
  execution, so the human sees the full change set even for ones Claude Code
  executes unprompted.

---

## Constraints

- No fixed line-count cap. The standard is: **no rule stated in more than
  one file**, and **a skill's trigger description should be crisp enough
  that a smaller model doesn't need to read the whole file to know if it
  applies**. If achieving that requires shortening a file, shorten it.
- Never delete outright — archive per `deprecate-code`.
- Do not touch `AGENTS.md`, `AGENTS.planning.md`, or `AGENTS.execution.md`
  content in this pass beyond updating skill-reference tables/paths if a
  skill is merged or archived and those files point to it.
- Do not create new skills as part of this audit — this pass is about
  reduction, not addition.

---

## Required Output

1. **Audit report** (in the spec): every skill, one line each — clean /
   overlaps-with-X / bloated / merge-candidate, with reasoning.
2. **Change list**: what was merged into what, what was archived, what's
   flagged for human decision and why.
3. **Updated `SYSTEM_OVERVIEW.md`**: §8/§9 reflect the post-audit skill set
   accurately — this is the file used to brief AI readers on the system, so
   it must be correct after this pass, not stale.

---

## Validation Criteria

1. Every skill file on disk is accounted for in the audit report — none
   silently skipped.
2. Every executed merge/archive is traceable: old file in `archive/` with a
   header pointing to its replacement, all references updated.
3. No rule appears in more than one skill file after the pass.
4. `SYSTEM_OVERVIEW.md` matches the actual skill set on disk exactly —
   re-run the disk-vs-doc diff from step 2 above and confirm zero drift.
5. Nothing was deleted outright; everything retired is archived.
