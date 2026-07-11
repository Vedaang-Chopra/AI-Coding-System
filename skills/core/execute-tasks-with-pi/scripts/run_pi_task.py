"""Dispatch one atomic pi CLI task and reliably detect success.

pi's own process exit code is not trustworthy: an unrelated bug in an
installed extension (pi-auto-rename) can crash the process with exit code 1
*after* pi has already produced a correct response. This wrapper instead
parses pi's --mode json NDJSON stdout stream for a "type":"agent_end" event,
which is pi's own signal that the agent turn actually finished, and reports
success/failure based on that rather than $?.

Usage:
    python3 tools/pi_agent/run_pi_task.py --prompt "text" --out runs/task-1.ndjson
    python3 tools/pi_agent/run_pi_task.py --prompt-file task-1.md --out runs/task-1.ndjson
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_TIMEOUT_S = 600


def _extract_final_assistant_text(agent_end_event: dict) -> str:
    """Pull the last assistant text block out of an agent_end event's messages."""
    for message in reversed(agent_end_event.get("messages", [])):
        if message.get("role") != "assistant":
            continue
        for block in message.get("content", []):
            if block.get("type") == "text" and block.get("text"):
                return block["text"]
    return ""


def run_pi_task(
    prompt: str,
    *,
    provider: str = "openai-codex",
    model: str = "gpt-5.4-mini",
    timeout_s: int = DEFAULT_TIMEOUT_S,
    out_path: Path,
) -> dict:
    """Run one pi task, save the raw NDJSON stream, and return a result dict.

    Result dict always has: success, summary, started_at, ended_at,
    duration_s, pi_returncode. These are the fields needed to build a
    pi_run_log.json record without hand-guessing timestamps afterward.
    """
    cmd = ["pi", "--provider", provider, "--model", model, "--mode", "json", "-p", prompt]
    started_at = datetime.now(timezone.utc)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s)
    except subprocess.TimeoutExpired:
        ended_at = datetime.now(timezone.utc)
        out_path.write_text(f"[TIMEOUT after {timeout_s}s, no output captured]\n")
        return {
            "success": False,
            "summary": f"TIMEOUT after {timeout_s}s",
            "started_at": started_at.isoformat(),
            "ended_at": ended_at.isoformat(),
            "duration_s": (ended_at - started_at).total_seconds(),
            "pi_returncode": None,
        }
    ended_at = datetime.now(timezone.utc)

    out_path.write_text(result.stdout)
    if result.stderr:
        out_path.with_suffix(out_path.suffix + ".stderr").write_text(result.stderr)

    agent_end_event = None
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "agent_end":
            agent_end_event = event

    base = {
        "started_at": started_at.isoformat(),
        "ended_at": ended_at.isoformat(),
        "duration_s": (ended_at - started_at).total_seconds(),
        "pi_returncode": result.returncode,
    }

    if agent_end_event is None:
        return {
            **base,
            "success": False,
            "summary": (
                f"No agent_end event found in pi output (process exit code {result.returncode}). "
                f"Raw output saved to {out_path}."
            ),
        }

    final_text = _extract_final_assistant_text(agent_end_event)
    return {**base, "success": True, "summary": final_text}


def _write_record_template(
    *, out_path: Path, run_result: dict, provider: str, model: str
) -> Path:
    """Write a partially-filled JSON record next to out_path for query_pi_log.py append."""
    template = {
        "run_id": "FILL_IN__<group>__<task_id>",
        "group": "FILL_IN",
        "task_id": "FILL_IN",
        "fix_plan_item": "FILL_IN",
        "task_spec": "FILL_IN",
        "test_spec": "FILL_IN",
        "started_at": run_result["started_at"],
        "ended_at": run_result["ended_at"],
        "provider": provider,
        "model": model,
        "pi_exit_code": 0 if run_result["success"] else 1,
        "pi_agent_end_seen": run_result["success"],
        "pi_reported_status": "success" if run_result["success"] else "failure",
        "files_touched": ["FILL_IN"],
        "independent_verification": {
            "commands": ["FILL_IN"],
            "result": "FILL_IN (pass|fail)",
            "notes": "FILL_IN",
        },
        "final_status": "FILL_IN (verified_complete|verified_failed|needs_human_review|in_progress)",
        "notes": f"duration_s={run_result['duration_s']:.1f}, raw_output={out_path}",
    }
    template_path = out_path.with_suffix(out_path.suffix + ".record_template.json")
    template_path.write_text(json.dumps(template, indent=2) + "\n")
    return template_path


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__)
    prompt_group = parser.add_mutually_exclusive_group(required=True)
    prompt_group.add_argument("--prompt", help="Prompt text to send to pi")
    prompt_group.add_argument("--prompt-file", help="Path to a file whose contents are the prompt")
    parser.add_argument("--provider", default="openai-codex")
    parser.add_argument("--model", default="gpt-5.4-mini")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_S, help="Timeout in seconds")
    parser.add_argument("--out", required=True, help="Path to save the raw NDJSON stdout stream")
    args = parser.parse_args()

    prompt = args.prompt if args.prompt else Path(args.prompt_file).read_text()
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    result = run_pi_task(
        prompt,
        provider=args.provider,
        model=args.model,
        timeout_s=args.timeout,
        out_path=out_path,
    )
    template_path = _write_record_template(
        out_path=out_path, run_result=result, provider=args.provider, model=args.model
    )

    print(f"agent_end_seen: {result['success']}")
    print(f"duration_s: {result['duration_s']:.1f}")
    print(f"pi_returncode: {result['pi_returncode']}")
    print(f"raw_output: {out_path}")
    print(f"record_template: {template_path}  (fill in FILL_IN fields after independent verification)")
    print("---")
    print(result["summary"])

    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
