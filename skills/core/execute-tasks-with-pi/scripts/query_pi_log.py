"""Query and append tool for docs/specs/pi_agent_tasks/pi_run_log.json.

The log records one entry per pi CLI dispatch. Reading the raw JSON file
directly wastes context once it grows past a handful of runs; this script
gives targeted access instead (list, show one record, filter, summarize).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

DEFAULT_LOG_PATH = Path("docs/specs/pi_agent_tasks/pi_run_log.json")

REQUIRED_FIELDS = (
    "run_id",
    "group",
    "task_id",
    "fix_plan_item",
    "task_spec",
    "test_spec",
    "started_at",
    "ended_at",
    "provider",
    "model",
    "pi_exit_code",
    "pi_agent_end_seen",
    "pi_reported_status",
    "files_touched",
    "independent_verification",
    "final_status",
    "notes",
)

VALID_FINAL_STATUSES = ("verified_complete", "verified_failed", "needs_human_review", "in_progress")


def _load_log(log_path: Path) -> dict[str, Any]:
    """Load the JSON run log from disk."""
    return json.loads(log_path.read_text())


def _save_log(log: dict[str, Any], log_path: Path) -> None:
    """Write the JSON run log back to disk, pretty-printed."""
    log_path.write_text(json.dumps(log, indent=2) + "\n")


def cmd_list(args: argparse.Namespace) -> None:
    """Print one compact line per run, optionally filtered by group/status."""
    log = _load_log(args.log_path)
    runs = log["runs"]
    if args.group:
        runs = [r for r in runs if r.get("group") == args.group]
    if args.status:
        runs = [r for r in runs if r.get("final_status") == args.status]
    if not runs:
        print("(no matching runs)")
        return
    for run in runs:
        print(
            f"{run['run_id']:<45} {run.get('final_status', '?'):<20} "
            f"{run.get('fix_plan_item', '?'):<8} {run.get('notes', '')[:60]}"
        )


def cmd_show(args: argparse.Namespace) -> None:
    """Print the full record for one run_id."""
    log = _load_log(args.log_path)
    for run in log["runs"]:
        if run["run_id"] == args.run_id:
            print(json.dumps(run, indent=2))
            return
    print(f"No run found with run_id={args.run_id!r}", file=sys.stderr)
    sys.exit(1)


def cmd_summary(args: argparse.Namespace) -> None:
    """Print counts of runs grouped by final_status, then by group."""
    log = _load_log(args.log_path)
    runs = log["runs"]
    print(f"Total runs: {len(runs)}")
    by_status: dict[str, int] = {}
    by_group: dict[str, int] = {}
    for run in runs:
        by_status[run.get("final_status", "?")] = by_status.get(run.get("final_status", "?"), 0) + 1
        by_group[run.get("group", "?")] = by_group.get(run.get("group", "?"), 0) + 1
    print("\nBy final_status:")
    for status, count in sorted(by_status.items()):
        print(f"  {status:<20} {count}")
    print("\nBy group:")
    for group, count in sorted(by_group.items()):
        print(f"  {group:<45} {count}")


def cmd_append(args: argparse.Namespace) -> None:
    """Append one validated run record read from a JSON file to the log."""
    record = json.loads(Path(args.file).read_text())
    missing = [field for field in REQUIRED_FIELDS if field not in record]
    if missing:
        print(f"Record is missing required fields: {missing}", file=sys.stderr)
        sys.exit(1)
    if record["final_status"] not in VALID_FINAL_STATUSES:
        print(
            f"final_status={record['final_status']!r} not in {VALID_FINAL_STATUSES}",
            file=sys.stderr,
        )
        sys.exit(1)

    log = _load_log(args.log_path)
    existing_ids = {run["run_id"] for run in log["runs"]}
    if record["run_id"] in existing_ids:
        print(f"run_id={record['run_id']!r} already exists in the log", file=sys.stderr)
        sys.exit(1)

    log["runs"].append(record)
    _save_log(log, args.log_path)
    print(f"Appended run_id={record['run_id']!r} (final_status={record['final_status']})")


def main() -> None:
    """CLI entry point: list, show, summary, append subcommands."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--log-path",
        type=Path,
        default=DEFAULT_LOG_PATH,
        help=f"Path to the run log JSON file (default: {DEFAULT_LOG_PATH}, relative to CWD)",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List runs, one line each")
    list_parser.add_argument("--group", help="Filter by group name")
    list_parser.add_argument("--status", help="Filter by final_status")
    list_parser.set_defaults(func=cmd_list)

    show_parser = subparsers.add_parser("show", help="Show the full record for one run_id")
    show_parser.add_argument("run_id")
    show_parser.set_defaults(func=cmd_show)

    summary_parser = subparsers.add_parser("summary", help="Print counts by status and group")
    summary_parser.set_defaults(func=cmd_summary)

    append_parser = subparsers.add_parser("append", help="Append a validated run record from a JSON file")
    append_parser.add_argument("file", help="Path to a JSON file containing one run record")
    append_parser.set_defaults(func=cmd_append)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
