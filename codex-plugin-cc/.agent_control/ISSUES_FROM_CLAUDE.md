# Issues Found Driving Pi Directly (from Claude, CAD Design repo)

Source: repeated attempts to have Pi (`openai/gpt-5.4-mini` via the `pi` CLI,
v0.79.10) execute a 2-line config fix
(`code_base/agentic_closed_loop/modules/agent_langgraph/config/schemas.py:58`
and `state/repair_state.py:278`, `max_turns` 2->3) in
`/Users/vedaangchopra/all_data/complete_technical_work/all_projects_implemented/CAD Design`.
Every attempt below used the same base invocation the controller uses:
`pi --model openai/gpt-5.4-mini --no-extensions --no-skills -p "<instruction>"`
(plus flag variations noted per row). **The task never succeeded — both target
lines are still `= 2`.**

I also read `pi_controller.mjs` and a sample of `.agent_runs/pi/*` from this
repo before writing this, so the items below are checked against what the
controller actually does today, not just what it says in the README.

---

## Issue 1 — Real multi-step file-edit tasks hang with zero output, zero CPU, zero network, indefinitely

**Symptom:** Given a task spec that reads a real project file then edits 1-2
real files, `pi -p "..."` produces **no stdout, no stderr, ever** — not even
partial output — and sits at 0% CPU with **no established network
connections** for as long as I let it run (confirmed up to ~7 minutes
unbounded, and separately killed by `timeout` at 40s/60s/90s/120s/150s across
~8 separate reproductions). This is not "thinking slowly" — genuine model
latency would still show an open TCP connection while streaming/waiting on a
response. Zero network for minutes means the process never got far enough to
even send the request.

**Isolated what does NOT trigger it** (all completed in 1-3s):
- A trivial prompt with no tool call (`"reply with exactly: ok"`).
- A single `read` tool call on an arbitrary file, absolute or relative path.
- A single `grep` tool call.
- A single `bash` tool call (`pwd`).
- A single `edit` + `read`-back on a **brand-new file in a brand-new
  directory** (e.g. `.scratch_test/copy.py`).

**Isolated what DOES trigger it:**
- A single `edit` + `read`-back on the **real, pre-existing, git-tracked**
  `config/schemas.py`.
- A copy of the same content placed **inside the same pre-existing `config/`
  directory** (untracked, so it's not a git-tracked-file issue specifically —
  it's about that directory, or about operating on a file within an existing,
  populated project directory rather than a fresh one).
- Any prompt requiring 2+ sequential real-file operations, even read-only
  ones, across files in different subdirectories of the real project tree.

**One additional data point, not fully isolated before the investigation was
redirected:** on the one attempt I could inspect with `lsof` while it was
still hung, the process had **three separate open directory file descriptors
on `/` (filesystem root)**, each with its own active kqueue watcher — not
scoped to the project directory at all. That is consistent with some
internal "watch/index the workspace" logic computing a broken root path
(the project directory name contains a space — `.../CAD Design` — which is a
classic trigger for this class of bug in Node CLIs that build paths via
string concatenation) and falling back to recursively watching/scanning the
entire disk, which would never finish in reasonable time. **This is a lead,
not a confirmed root cause** — I never got a clean `strace`/`--verbose`
capture of the exact moment it enters that state, because every prior
process was killed by `timeout` or by session teardown before I could attach
further tooling. If you want to chase this precisely, the repro trigger is:
run the controller's own `pi --no-extensions --no-skills -p "<instruction>"`
against a real multi-file edit task in a project whose path contains a space,
with `--no-timeout`, then `lsof -p <pid>` while it's silent.

**Why this matters for the controller:** `NO_OUTPUT_WARNING_MS` (5 min
default) will correctly flag this as `no-output-warning`, but then the job is
just left running forever with **no diagnostic signal beyond "no output"**
and no automated next step. There is currently no code path that
distinguishes "Pi is genuinely thinking" from "Pi is stuck" other than
elapsed time. Given zero-CPU + zero-network is a much stronger signal of
"stuck" than elapsed time alone, the controller could poll `pid`'s open
sockets/CPU% (via `lsof`/`ps`) once past the no-output threshold and record
that in `status.json` as an explicit `likely_stuck: true/false` field, so the
calling agent (Claude/Codex) can make an informed cancel/retry decision
instead of guessing.

---

## Issue 2 — `ask_user`-style "clarifying question" hang is a real, separate failure mode, and the controller's current detection can miss it entirely

**Symptom (from my own direct testing, not the controller):** with
extensions enabled (i.e. NOT `--no-extensions`), a stalled Pi process had
only a stdin-facing unix socket open, 0% CPU, no network — consistent with a
blocking read on stdin from the `ask_user` tool (registered by the globally
installed `pi-ask-user` npm extension, tool name confirmed as `ask_user` at
`~/.pi/agent/npm/node_modules/pi-ask-user/index.ts:1478`). Adding
`--exclude-tools ask_user` did **not** fix a subsequent hang — so excluding
that one tool is not sufficient on its own, other extensions can plausibly
block the same way.

**What the controller already does right:** it always passes
`--no-extensions`, which prevents the `pi-ask-user` extension (and all other
globally installed extensions — there are ~18 on this machine, including an
MCP adapter, LSP/format/test-on-write via `pi-lens`, a fuzzy-file-finder,
subagents, etc.) from loading at all. So the controller's production jobs
should never hit the *extension-based* `ask_user` blocking-stdin-read
scenario in the first place.

**What this implies:** because extensions are always off, any "question"
Pi asks in a controller job can only come from the model emitting plain text
and then the process exiting (no interactive tool available to keep it
alive) — which matches what I saw in this repo's own test runs
(`pi-20260706201613-v9ue4z`: prints `Question: choose a color?`, then exits
0, feedback arrives after the process is already dead). The controller's
`continue` fallback exists for exactly this reason and looks correct.
**But** `maybeRecordQuestion()` only fires on lines that end in `?` or match
a fixed keyword regex. Issue 1's hang produces **zero output of any kind**,
so this detector will never fire for that failure mode — a real multi-file
edit task that hangs looks identical, from the controller's point of view,
to a job that's simply thinking hard. The controller currently has no way
to tell these apart.

---

## Issue 3 — Confirmed EPERM crash from shared default session directory across concurrent/rapid jobs (seen in this repo's own `.agent_runs/pi/`)

**Evidence, directly from `codex-plugin-cc/.agent_runs/pi/pi-20260706072315-8b56m7/`:**

```
stderr: Warning: (startup session lookup, global settings) EPERM: operation not permitted, mkdir '/Users/vedaangchopra/.pi/agent/settings.json.lock'
stderr: Error: EPERM: operation not permitted, mkdir '/Users/vedaangchopra/.pi/agent/sessions/--Users-vedaangchopra-agent-governance-codex-plugin-cc--'
    at getDefaultSessionDir (.../session-manager.js:230:9)
Node.js v25.6.0
controller: pi exited with code 1
```

The very next job (`pi-20260706072429-7bjy1k`, ~74s later, identical
instruction and command) succeeded cleanly. This is consistent with two `pi`
processes racing to create the **same deterministic session directory**
(derived from the repo path — every job against this same repo maps to the
identical default session dir) and/or a stale lock left by a prior process.

**Why this matters:** `runPiForJob()` in `pi_controller.mjs:334-345` never
passes `--session-dir` or `--no-session`. Every job for a given repo shares
the same default session path. Any time two controller jobs for the same
repo run close together in time (very plausible for a build controller
driving multiple fixes), this crash can recur. This is a **sharp, immediate
failure** (exit code 1, clear stderr), unlike Issue 1's silent hang — so it's
easier to detect, but it's also easily fixed: pass a per-job
`--session-dir <job_dir>/pi-session` (or `--no-session` if the session isn't
needed after the job completes) so jobs never share session state.

---

## Issue 4 — Heavy concurrent `pi` usage on this machine is a live variable, not yet controlled for

At the time of testing, `ps` showed **13+ long-running interactive `pi`
processes** open across other terminal tabs (some with 10-35 minutes of
accumulated CPU time), all sharing the same `~/.pi/agent/` state directory
(auth, session dir, MCP cache, frecency DB). I did not isolate whether this
contributed to Issue 1's hangs, but Issue 3's EPERM proves shared global
state under `~/.pi/agent/` **can** collide across concurrent processes. Any
controller that might run multiple jobs concurrently (or where the user also
has interactive `pi` sessions open, which is normal on this machine) should
assume shared global state is a live collision risk, not a theoretical one.

---

## Issue 5 — Wrapper exit code vs. Pi's real exit code (a trap I fell into once; the controller's design already avoids it, worth stating explicitly so it stays that way)

In my own ad hoc `timeout ... | tee ...; echo $?` scripts, a background-task
notification once reported the **wrapper shell's** exit code as "completed,
exit code 0" while the actual `pi` process inside had been killed by
`timeout` (real exit code 124, captured separately via `${PIPESTATUS[0]}`).
`pi_controller.mjs` already does this correctly — it reads the child
process's own `exit`/`close` event directly (not a wrapper's `$?`) and writes
that to `exit_code.txt` / `status.json`. Flagging this only so it's treated
as a hard requirement in any future refactor, not accidentally regressed:
**never infer job success from a wrapper script's own exit code; always use
the actual `pi` child process's exit event.**

---

## Suggested priority for next build steps

1. **Issue 3 (EPERM)** — sharpest, easiest, fully reproduced with a clear
   stack trace already sitting in this repo's own `.agent_runs/`. Add
   per-job `--session-dir` (or `--no-session`) to `runPiForJob()`.
2. **Issue 1 (silent hang on real multi-file tasks)** — highest impact, since
   this is the failure mode that has blocked the actual target task (the
   CAD Design `max_turns` fix) end-to-end, every single attempt, with no
   successful completion yet. At minimum: add a `likely_stuck` heuristic
   (zero CPU + zero network past the no-output threshold, via `lsof`/`ps`)
   to `status.json` so the calling agent gets a real signal instead of
   silence. Stretch goal: capture `--verbose` output and/or an `lsof`
   snapshot automatically the moment `no-output-warning` fires, so the next
   session doesn't have to reconstruct this by hand.
3. **Issue 2 (question detection gap)** — document clearly (e.g. in the
   README) that `maybeRecordQuestion` cannot distinguish "thinking" from
   "stuck" from "waiting on a question that was never printed," so callers
   don't over-trust the `awaiting-feedback` phase as the only thing to watch
   for.
4. **Issue 4** — lower priority; mitigated by fixing Issue 3's isolation.
