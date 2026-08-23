# Instruction for Codex: harden the Pi controller

## Context

Read `.agent_control/ISSUES_FROM_CLAUDE.md` first — it documents 5 concrete
problems Claude hit trying to drive `pi` (the `fast-code`-role model per config/models.yaml) directly and
through this controller, with evidence from real reproductions and from this
repo's own `.agent_runs/pi/*` history. Read `.agent_control/pi_controller.mjs`
and `.agent_control/README.md` next so you know the current design before
changing it.

Goal: make the controller reliable enough that Claude Code, acting as the
director, can hand it a real multi-step task (read files, edit 1-2 real
project files, verify) and get back either a real success with evidence, or
an honest, actionable failure signal — never silence, never a false
"completed."

Do not do a rewrite. This is a set of targeted fixes on top of the existing
design. Keep the existing command surface (`setup run status logs questions
feedback continue result cancel verify`) working exactly as documented unless
a fix requires a new flag or a new status field.

## Fix in this order

### 1. Session-directory collision (Issue 3 — do this first, cheapest, already reproduced)

`runPiForJob()` in `pi_controller.mjs` never isolates the session directory.
Every job for a given repo shares `~/.pi/agent/sessions/<repo-slug>`, and a
real EPERM crash from this collision is already sitting in
`.agent_runs/pi/pi-20260706072315-8b56m7/stderr.log`.

Add a per-job session directory to the spawned `pi` args — either
`--session-dir <job_dir>/pi-session` or `--no-session` if the job doesn't
need session persistence after it exits (check which `pi --help` actually
supports and pick whichever avoids any two jobs, for the same or different
repos, ever computing the same session path).

**Verify:** launch two `run` jobs back-to-back (within ~1s of each other)
against the same repo with trivial instructions, confirm both reach
`completed` with exit code 0, and neither `stderr.log` contains `EPERM`.

### 2. Silent-hang detection (Issue 1 — highest impact, still unsolved)

Right now, past `NO_OUTPUT_WARNING_MS` (default 5 min), the controller sets
`phase: "no-output-warning"` and does nothing else. That is the exact state
Claude got stuck in, repeatedly, trying to get Pi to make a real 2-line edit
across two real files — the job never produced a single byte of output and
never finished.

Add a `likely_stuck` signal to `status.json`, computed once the no-output
threshold is crossed:

- Read the job's `pid` from `pid.txt`.
- Check CPU usage (`ps -o %cpu -p <pid>`) — near-zero sustained CPU is a
  strong stuck signal (real model latency still burns some CPU handling the
  stream; a wedged process doesn't).
- Check open network connections for the process (`lsof -p <pid> -a -i` or
  equivalent) — zero established connections after the no-output threshold
  means it never even reached the API, which rules out "still thinking."
- If CPU is ~0 and there are no network connections, set
  `status.json.likely_stuck = true` and append a stream.log line explaining
  why (e.g. "0% CPU, no network connections, no output for Nms — likely
  stuck, not thinking").
- If either signal shows real activity (CPU or an open connection), leave
  `likely_stuck = false` — the job may genuinely be slow.

This doesn't need to auto-cancel anything. It just needs to turn "silence"
into an honest, checkable signal so the calling agent can decide to `cancel`
instead of waiting forever on a job that will never finish.

**Verify against a real task, not a mock.** The existing test runs in
`.agent_runs/pi/*` (`"ask for a word"`, `"ask for a color"`) look like they
exercised a stub/mock `pi`, not the real CLI reasoning about real files —
they complete in ~150ms and echo the feedback text back verbatim, which real
model output wouldn't do. To actually verify this fix, run the controller
against a real repo with a real instruction that reads a project file and
edits 1-2 other real project files (ask Claude for the exact repro
instruction from `ISSUES_FROM_CLAUDE.md` Issue 1 if you want the same one
that reproduced the hang), and confirm:
- If it hangs again, `likely_stuck` flips to `true` within a reasonable
  window past the no-output threshold, with a clear log line.
- If it succeeds this time, confirm real file changes via `git_diff.patch`
  and `verify.log` — not just Pi's own summary.

### 3. Document the question-detection blind spot (Issue 2)

`maybeRecordQuestion()` only fires on lines ending in `?` or matching a
keyword regex. Because the controller always passes `--no-extensions`, the
real `ask_user` tool never loads in production jobs, so this text-matching
approach is a reasonable fit for "Pi prints a question in plain text and
exits" — but it cannot distinguish that from Issue 1's total silence. Add a
short note to the README under "Controller Rules" or "Run Modes" stating
this explicitly, so nobody mistakes "no `awaiting-feedback` phase" for "job
is fine."

### 4. Lower priority: shared global state (Issue 4)

Not a required fix right now — isolating the session directory (#1) removes
the concrete collision that was observed. Just be aware, if you add any
other shared-state writes (frecency DB, MCP cache, etc.), that this machine
regularly has 10+ concurrent interactive `pi` sessions open, so anything
under `~/.pi/agent/` that isn't per-job-isolated is a latent collision.

## When done

Update `.agent_control/README.md` to describe the new `--session-dir`/
`--no-session` behavior and the new `likely_stuck` status field. Report back
with: what changed, the verify steps you actually ran (not just "should
work"), and whether the real-task repro in step 2 hung again or succeeded —
if it still hangs even with the new detection, say so plainly; a working
diagnostic on an unsolved hang is still real progress, don't oversell it as
a fix.
