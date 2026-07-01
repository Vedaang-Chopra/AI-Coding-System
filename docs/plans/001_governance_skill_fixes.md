# Plan: Governance Skill Fixes
**Spec:** docs/specs/001_governance_skill_fixes.md
**Status:** Confirmed

## Summary

Five markdown files receive targeted additions. No new files are created. No
layers change — these are governance skill documents, not production code. Each
edit adds content that is missing from an existing section; none removes existing
content. Dependency order: skills edited first, SYSTEM_OVERVIEW.md updated last
(it summarizes the skills).

## Files to Modify

| File | What changes |
|---|---|
| `skills/core/design-layered-module/SKILL.md` | Expand Layer 2 to describe two-tier interface model; add violation pattern; fix stale `write-notebook` reference |
| `skills/core/design-feature-notebook/SKILL.md` | Add stage function pre-check to "Before Creating" section; add workflow templates; add 3 forbidden-pattern checklist items |
| `skills/core/design-python-code/SKILL.md` | Add "Named OOP Patterns" section with 4 patterns + detection triggers; add 4 checklist items |
| `skills/core/add-observability/SKILL.md` | Add arg0/arg1 forbidden pattern; add log-level-by-context rule; add loop aggregation code example; add log content standard |
| `SYSTEM_OVERVIEW.md` | Update §8 summary entries for all 4 changed skills |

## Dependency Order

1. `design-layered-module` — defines the two-tier interface concept that notebook skill references
2. `design-feature-notebook` — references the interface model; can now add the pre-check gate
3. `design-python-code` — independent of 1 and 2; add OOP patterns
4. `add-observability` — independent; add logging rules
5. `SYSTEM_OVERVIEW.md` — updated last after all four skills are finalized

## Validation Criteria

- [ ] `grep "Tier 1\|Tier 2\|two-tier" design-layered-module/SKILL.md` — matches
- [ ] `grep "fix the interface\|stage function" design-feature-notebook/SKILL.md` — matches
- [ ] `grep "Registry\|Cache-bearing\|Detection trigger" design-python-code/SKILL.md` — matches
- [ ] `grep "FORBIDDEN\|arg0\|loop aggregation\|named.*param" add-observability/SKILL.md` — matches
- [ ] `grep "two-tier\|Registry\|arg0\|stage function" SYSTEM_OVERVIEW.md` — matches for each skill
