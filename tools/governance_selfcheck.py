#!/usr/bin/env python3
"""Governance self-check: audit the agent-governance repo against its own rules.

Starter suite (WS1/WS2). Checks:
  1. No hardcoded model IDs in rule files (mirrors tests/test_models_config.py).
  2. templates/ruff.toml exists and parses as valid TOML with line-length set.
  3. No silent broad exception handlers (`except Exception: pass/return`) in tools/.
  4. docs/session_state.md exists and mentions the current month of last update.
  5. No stray copy/v2/new-suffixed filenames in active dirs.

Exit 0 = clean. Exit 1 = findings listed on stdout.
"""

from __future__ import annotations

import pathlib
import re

try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11 — fall back to regex line-length check
    tomllib = None
from datetime import datetime

REPO = pathlib.Path(__file__).resolve().parent.parent

EXCLUDED_PARTS = {
    ".git",
    "node_modules",
    ".agent_runs",
    ".hermes",
    "archive",
    "docs",
    "tests",
}
RULE_FILES = [
    "AGENTS.md",
    "AGENTS.planning.md",
    "AGENTS.execution.md",
    "SYSTEM_OVERVIEW.md",
    "CONVENTIONS.md",
    "templates/project-AGENTS.md",
]
MODEL_ID_PATTERN = re.compile(
    r"(?i)(?<![a-z0-9.-])(gpt-4o|gpt-5\.4-mini|claude-sonnet-[0-9.-]+|nemotron|kimi|minimax)(?![a-z0-9.-])"
)
SILENT_EXC_PATTERN = re.compile(
    r"except\s+(?:Exception|BaseException)\s*:\s*\n\s*(?:pass|return\b|continue\b)"
)
STRAY_NAME_PATTERN = re.compile(
    r".*(copy\d*|_v\d+|_new|_final|\bnew\d*)\.(py|mjs|ipynb)$", re.I
)


def check_hardcoded_models(findings: list[str]) -> None:
    for name in RULE_FILES:
        path = REPO / name
        if not path.is_file():
            findings.append(f"missing rule file: {name}")
            continue
        for i, line in enumerate(path.read_text().splitlines(), 1):
            if MODEL_ID_PATTERN.search(line):
                findings.append(f"{name}:{i}: hardcoded model id")


def check_ruff_template(findings: list[str]) -> None:
    path = REPO / "templates" / "ruff.toml"
    if not path.is_file():
        findings.append("missing templates/ruff.toml")
        return
    try:
        if tomllib is not None:
            data = tomllib.loads(path.read_text())
            actual = data.get("line-length")
        else:
            match = re.search(r"^line-length\s*=\s*(\d+)", path.read_text(), re.M)
            actual = int(match.group(1)) if match else None
    except (tomllib.TOMLDecodeError, ValueError) as exc:
        findings.append(f"templates/ruff.toml invalid: {exc}")
        return
    if actual != 100:
        findings.append(f"templates/ruff.toml line-length != 100 (got {actual})")


def check_silent_exceptions(findings: list[str]) -> None:
    tools = REPO / "tools"
    if not tools.is_dir():
        return
    for path in sorted(tools.rglob("*.py")):
        text = path.read_text()
        if SILENT_EXC_PATTERN.search(text):
            findings.append(f"{path.relative_to(REPO)}: silent broad exception handler")


def check_session_state_fresh(findings: list[str]) -> None:
    path = REPO / "docs" / "session_state.md"
    if not path.is_file():
        findings.append("missing docs/session_state.md")
        return
    month_prefix = datetime.now().strftime("%Y-%m")
    if month_prefix not in path.read_text():
        findings.append(f"docs/session_state.md has no entry dated {month_prefix}")


def check_stray_filenames(findings: list[str]) -> None:
    for part in ("tools", "skills/core", "config", "templates"):
        root = REPO / part
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.is_file() and not any(p in EXCLUDED_PARTS for p in path.parts):
                if STRAY_NAME_PATTERN.match(path.name):
                    findings.append(
                        f"{path.relative_to(REPO)}: stray copy/v2/new filename"
                    )


CHECKS = [
    check_hardcoded_models,
    check_ruff_template,
    check_silent_exceptions,
    check_session_state_fresh,
    check_stray_filenames,
]


def main() -> int:
    findings: list[str] = []
    for check in CHECKS:
        check(findings)
    if findings:
        print(f"GOVERNANCE_SELFCHECK: FAIL ({len(findings)} findings)")
        for f in findings:
            print(f"  - {f}")
        return 1
    print("GOVERNANCE_SELFCHECK: PASS (0 findings)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
