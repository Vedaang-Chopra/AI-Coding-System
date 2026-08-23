# Needs manual relocation

`codebase-design/SKILL.md` in this directory was removed from
`~/agent-governance/skills/optional/mcp-graph/` during the skill audit
(`docs/specs/005_skill_audit.md`, Finding F5).

It describes the folder structure and conventions of a different project
(folders like `dataset_creation/`, `cad_code_generation/`, `analytics/` —
this appears to be the "CAD Design" project referenced elsewhere in this
repo's history, not agent-governance itself), and had no relation to the
`mcp-graph/` skills it was nested inside — no `code-review-graph` MCP tool
references at all.

It does not belong in the shared agent-governance skills library. Move
`codebase-design/` into the CAD Design project's own repo (path unknown to
this agent — could not be inferred safely, so it was staged here instead of
moved directly). Once relocated, delete this `relocate-to-cad-code/`
directory.
