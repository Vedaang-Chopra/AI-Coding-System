"""Guard tests: model IDs must live only in config/models.yaml.

These tests FAIL if a hardcoded model identifier appears in governance rule
files (AGENTS files, core skills). Run via: pytest tests/test_models_config.py
"""

from __future__ import annotations

import pathlib
import re

import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
MODELS_CONFIG = REPO_ROOT / "config" / "models.yaml"

# Files/dirs where role names are allowed but model IDs are not.
GUARDED_PATHS = [
    REPO_ROOT / "AGENTS.md",
    REPO_ROOT / "AGENTS.planning.md",
    REPO_ROOT / "AGENTS.execution.md",
    REPO_ROOT / "SYSTEM_OVERVIEW.md",
    REPO_ROOT / "CONVENTIONS.md",
    REPO_ROOT / "templates" / "project-AGENTS.md",
    REPO_ROOT / "skills" / "core",
    REPO_ROOT / "codex-plugin-cc" / ".agent_control",
]

# Run artifacts, audits, plans, and logs legitimately mention model IDs.
EXCLUDED_PARTS = {
    ".git",
    "node_modules",
    ".agent_runs",
    ".hermes",
    "archive",
    "docs",  # audits/specs/plans/logs are historical records
    "tests",  # fixtures deliberately contain model IDs
}


def load_model_ids() -> set[str]:
    """Extract every model ID declared in config/models.yaml."""
    with open(MODELS_CONFIG) as fh:
        data = yaml.safe_load(fh)
    ids: set[str] = set()
    for section in data.values():
        if isinstance(section, dict):
            for value in section.get("models", []) or []:
                ids.add(str(value).lower())
    return ids


def guarded_files() -> list[pathlib.Path]:
    """All text files under guarded paths, minus exclusions."""
    files: list[pathlib.Path] = []
    for path in GUARDED_PATHS:
        if path.is_file():
            files.append(path)
        elif path.is_dir():
            for candidate in sorted(path.rglob("*")):
                if candidate.is_file() and not any(
                    part in EXCLUDED_PARTS for part in candidate.parts
                ):
                    files.append(candidate)
    return files


def find_model_id_hits(text: str, model_ids: set[str]) -> list[str]:
    """Return model-ID strings found in text (word-boundary match)."""
    hits: list[str] = []
    for model_id in model_ids:
        if re.search(rf"(?i)(?<![a-z0-9.-]){re.escape(model_id)}(?![a-z0-9.-])", text):
            hits.append(model_id)
    return hits


def test_models_config_exists_and_parses() -> None:
    assert MODELS_CONFIG.is_file(), "config/models.yaml is missing"
    data = yaml.safe_load(MODELS_CONFIG.read_text())
    for role in ("planning", "complex-reasoning", "fast-code", "local"):
        assert role in data, f"required role '{role}' missing from models.yaml"
        assert data[role]["models"], f"role '{role}' has no models listed"


def test_no_hardcoded_model_ids_in_rule_files() -> None:
    model_ids = load_model_ids()
    offenders: list[str] = []
    for path in guarded_files():
        try:
            text = path.read_text()
        except UnicodeDecodeError:
            continue
        for hit in find_model_id_hits(text, model_ids):
            offenders.append(f"{path.relative_to(REPO_ROOT)}: {hit}")
    assert not offenders, (
        "Hardcoded model IDs outside config/models.yaml:\n" + "\n".join(offenders)
    )


def test_role_names_resolve_in_config() -> None:
    """Roles referenced in AGENTS.planning.md alias table must exist in config."""
    with open(MODELS_CONFIG) as fh:
        data = yaml.safe_load(fh)
    planning_text = (REPO_ROOT / "AGENTS.planning.md").read_text()
    for role in ("planning", "complex-reasoning", "fast-code", "local"):
        assert f"`{role}`" in planning_text, (
            f"role '{role}' not documented in AGENTS.planning.md"
        )
        assert role in data, f"role '{role}' missing from models.yaml"
