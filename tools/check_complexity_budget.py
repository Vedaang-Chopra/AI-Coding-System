#!/usr/bin/env python3
"""Check def/class additions in a git diff range against a stated budget.

Prints exactly one greppable verdict line:
    COMPLEXITY_BUDGET: PASS (3/5 new defs)
    COMPLEXITY_BUDGET: FAIL (7/5 new defs)

Exit code 0 on PASS, 1 on FAIL, 2 on usage errors.

PROVENANCE RULE: this script's stdout is the artifact of record. Whatever
invokes it (task runner, wrapper, or the agent's shell) must copy the
COMPLEXITY_BUDGET line VERBATIM into AGENT_EXECUTION_LOG.md for any task that
touched Python code. Paraphrasing or summarizing it in the log is a task FAIL.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys

VERBOSITY_TOKENS = {
    "def": re.compile(r"^\+\s*(?:async\s+)?def\b"),
    "class": re.compile(r"^\+\s*class\b"),
}


def get_diff(repo: str, rng: str) -> str:
    """Return `git diff` output for the range in repo."""
    result = subprocess.run(
        ["git", "-C", repo, "diff", rng, "--unified=0"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def count_additions(diff: str) -> dict[str, int]:
    """Count added def/class declaration lines in unified-diff text."""
    counts = {"def": 0, "class": 0}
    for line in diff.splitlines():
        for token, pattern in VERBOSITY_TOKENS.items():
            if pattern.match(line):
                counts[token] += 1
    return counts


def verdict(added: int, budget: int) -> str:
    """Return PASS if added <= budget else FAIL."""
    return "PASS" if added <= budget else "FAIL"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", default=".", help="Path to the git repository")
    parser.add_argument(
        "--range", dest="rng", required=True, help="Git diff range, e.g. HEAD~1..HEAD"
    )
    parser.add_argument(
        "--budget", type=int, required=True, help="Max allowed new def/class additions"
    )
    args = parser.parse_args(argv)

    try:
        diff = get_diff(args.repo, args.rng)
    except subprocess.CalledProcessError as exc:
        print(f"git diff failed: {exc.stderr.strip()}", file=sys.stderr)
        return 2

    counts = count_additions(diff)
    total = counts["def"] + counts["class"]
    status = verdict(total, args.budget)
    # Fixed format — Task 5's skill gates and governance_selfcheck grep for it.
    print(f"COMPLEXITY_BUDGET: {status} ({total}/{args.budget} new defs)")
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
