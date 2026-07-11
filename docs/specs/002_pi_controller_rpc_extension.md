# Spec 002 — Pi RPC Controller (Claude Code → Pi director/executor bridge)

**Status:** Draft — ready to hand to a build session
**Date:** 2026-07-09
**Author:** Claude Code (from Vedaang's brief, this session)
**Feature number:** 002

---

## 0. Read this whole file before writing any code

This is a single self-contained build instruction, in the same spirit as
`codex-plugin-cc/.agent_control/CODEX_BUILD_INSTRUCTION.md` (read that file too —
it's the closest prior art and you should not repeat its process). Do not start
coding after skimming section 1. Sections 4-6 contain hard requirements that
change the architecture, not incremental polish.

---

## 1. Purpose and vision

Claude Code acts as the **director**: it holds a design/task, decomposes it,
picks a model appropriate to the task's complexity, and hands atomic units of
work to **Pi** (`pi` CLI) as the **executor**, running cheaper/open models
(currently `gpt-5.4-mini` via `--provider openai-codex`, but this must not be
hardcoded — see §4).

This has already been tried by hand this session, twice:
- Once via raw terminal `pi --mode json -p "..."` (worked, but the model
  silently violated an unstated invariant that Claude had to catch by
  independent re-verification — see §3).
- Once by reviewing `codex-plugin-cc`'s existing `.agent_control/pi_controller.mjs`
  (a real, working controller — but its own most recent real job history shows
  it hanging with **zero output** on even a trivial `"Print exactly:
  Hello, world!"` prompt, as recently as yesterday).

Neither approach is good enough yet to be "a coding agent you can control." This
spec is for the next iteration: a controller that gives Claude Code (a) real
visibility into what Pi is doing while it works, not just "no output yet," (b) a
genuine two-way channel to answer Pi's questions mid-task, not a crude
text-scraping hack, and (c) confidence that a "done" report is actually true.

This is explicitly **an evolving system**. Do not over-build v1. Get the
architecture right (§4), ship the minimum that proves it end-to-end (§7), and
leave clear extension points (§8) for the next session.

---

## 2. Required reading before designing anything

Read, in this order, and do not skip any of them — each one either changes the
architecture or documents a trap already fallen into once:

1. `~/agent-governance/AGENTS.md`
2. `~/agent-governance/AGENTS.execution.md` — this is the file Pi itself is
   supposed to read when it acts as an execution agent in this ecosystem. The
   new controller must actually get this content in front of Pi (see §4.4) —
   today's `codex-plugin-cc` controller does **not** do this; it hands Pi a raw
   instruction string and nothing else.
3. `~/agent-governance/docs/ai_context/pi_agent_tooling_guide.md` — the full
   capability surface of Pi (run modes, RPC protocol, SDK, tools, skills,
   extensions, packages, trust). This is the most important reference in this
   list. In particular read §3 "Run Modes", §5 "Running Pi From Another Agent"
   (all four options: subprocess, RPC, SDK, extension-driven worker), and §11
   "Safety and Limits."
4. `~/agent-governance/codex-plugin-cc/.agent_control/README.md`
5. `~/agent-governance/codex-plugin-cc/.agent_control/pi_controller.mjs` — the
   existing, working, subprocess-based controller. Read the whole file (786
   lines). This is your primary prior-art reference for job-directory
   conventions, artifact naming, and the `verify`/`result`/`cancel` command
   shapes — **reuse these conventions**, don't invent new ones for the parts
   that already work.
6. `~/agent-governance/codex-plugin-cc/.agent_control/ISSUES_FROM_CLAUDE.md` —
   5 concrete problems found driving Pi directly, with real reproductions.
7. `~/agent-governance/codex-plugin-cc/.agent_control/CODEX_BUILD_INSTRUCTION.md`
   — the instruction that produced the current hardened controller. Read what
   it asked for and cross-check against what actually shipped (§3 below tells
   you what's still broken despite this pass).
8. `~/agent-governance/codex-plugin-cc/tests/pi-controller.test.mjs` — note
   every test here fakes the `pi` binary via a `process.exit(...)` fixture
   script. None of them drive the real CLI. This is a real coverage gap you
   must not repeat (see §7).
9. `~/agent-governance/codex-plugin-cc/.agent_runs/pi/` — real job artifacts
   from actual runs. Look at the 3 most recent directories as of this writing
   (`pi-20260708055327-qcxehz`, `pi-20260708055408-z6drew`,
   `pi-20260708055436-27zven`) — read their `instruction.txt`, `status.json`,
   and `stream.log`. This is primary evidence for §3, not secondhand.

---

## 3. Ground truth: what is proven to work, and what is proven still broken

Do not take either of these on faith — the evidence is in the files in §2.9.

**Proven to work (current `codex-plugin-cc` controller, subprocess/`-p` based):**
- Job directory + artifact conventions (`instruction.txt`, `stdout.log`,
  `stderr.log`, `stream.log`, `status.json`, `git_status_before/after.txt`,
  `git_diff.patch`, `result.md`, `questions.jsonl`, `feedback.jsonl`,
  `stuck_diagnostics.log`, `pid.txt`, `exit_code.txt`).
- Per-job `--session-dir` isolation (fixed a real `EPERM` crash from
  concurrent jobs sharing a default session dir).
- `likely_stuck` diagnostic: after a no-output threshold, `ps`/`lsof` on the
  child PID distinguishes "genuinely computing" (nonzero CPU or an open
  network connection) from "wedged" (zero CPU, zero connections). Confirmed
  correct against a real hung process (`pi-20260708055436-27zven`:
  `cpu_percent: 0`, `network_connection_count: 0`, `likely_stuck: true`).
- `verify <job_id> "<command>"` — caller-chosen verification, never
  self-judged by Pi. Keep this pattern exactly.
- Correct exit-code handling — reads the actual child process `close` event,
  never a wrapper shell's `$?`. Keep this exactly; it is easy to regress.

**Proven still broken, not fixed by the last hardening pass:**
- **The silent, zero-output hang is not root-caused.** All 3 of the most
  recent real jobs in `codex-plugin-cc` (2026-07-08, after every hardening
  fix landed) produced **zero stdout/stderr** and had to be cancelled by
  hand, including one whose entire instruction was `"Print exactly: Hello,
  world!"` — no tool call, no real file, nothing that should be able to hang.
  This directly contradicts the original hypothesis in
  `ISSUES_FROM_CLAUDE.md` (that it was specific to real multi-file edits, or
  to a project path containing a space) — `codex-plugin-cc`'s own path has no
  space, and this was a trivial prompt with no tools.
  **The current controller can only detect this after the fact; it cannot
  prevent it, explain it, or reliably work around it.** Treat this as the
  single highest-priority open problem for this build.
- **Question detection is a text heuristic, not a protocol.**
  `maybeRecordQuestion()` greps stdout/stderr for `?`-terminated lines or a
  fixed keyword regex. It cannot distinguish "Pi is thinking," "Pi is stuck,"
  and "Pi asked something but phrased it as a statement." Because the
  controller always passes `--no-extensions`, the real `ask_user` tool never
  loads, so this text-scraping approach is currently the *only* signal
  available — but it is fundamentally lossy.
- **No genuine mid-run steering.** `feedback` writes to the child's stdin if
  it's still alive; if Pi already exited, `continue` starts an entirely new
  job with the prior transcript pasted into a fresh instruction. There is no
  way to interrupt Pi's current turn, redirect it, or ask it a clarifying
  question back.
- **The model is hardcoded** (`const MODEL = "openai/gpt-5.4-mini"` in
  `pi_controller.mjs:8`). There is no way to route a harder task to a
  stronger model or a trivial task to a cheaper one without editing the
  controller's source.
- **Pi never actually reads this ecosystem's execution-agent rules.** The
  controller passes a raw instruction string and `--no-extensions
  --no-skills`. It never points Pi at `AGENTS.execution.md` (see §2.2) or a
  structured task file — everything Pi knows about how to behave comes from
  whatever the caller happened to type into the instruction string that run.
- **Tests are all mocked** (§2.8). Zero automated coverage exercises the real
  `pi` binary. The hardening pass's own build instruction flagged this and
  it's still true.
- **RPC mode is unused.** The controller's own README says so explicitly:
  "RPC is not implemented in this controller yet." Given §2.3's tooling guide
  documents a full RPC protocol with streaming tool-call events, `steer`,
  `follow_up`, and `abort` — this is very likely where the real fix for the
  observability and steering problems above lives. See §4.

---

## 4. Required architecture change: build on RPC, not `-p` subprocess text-scraping

This is the core decision this spec is making. Do not build "the same thing
again with a bigger `likely_stuck` heuristic." Read `pi_agent_tooling_guide.md`
§3, §5 (Option B), and §13 fully before disagreeing with this section.

### 4.1 Why RPC and not `-p`

`pi --mode rpc` is a long-lived subprocess controlled by JSON lines over
stdin/stdout. It gives you, natively, everything the current controller is
faking or missing:

| Need | `-p` subprocess (today) | RPC (`--mode rpc`) |
|---|---|---|
| "What is Pi doing right now" | Nothing until stdout/stderr bytes appear | `tool_execution_start/update/end`, `turn_start/end`, `agent_start/end`, `message_update` events, streamed live |
| Answer a mid-task question | Write raw text to stdin and hope the model is blocked on `readline`; or wait for exit and re-launch via `continue` | `{"type":"prompt","message":"...","streamingBehavior":"steer"}` — genuine mid-run steering |
| Queue follow-up work after Pi goes idle | Not supported | `{"type":"follow_up","message":"..."}` |
| Cancel cleanly | `SIGTERM` on the process group | `{"type":"abort"}` |
| Inspect current state without guessing | Not supported | `{"type":"get_state"}`, `{"type":"get_messages"}` |
| Switch model mid-session by task complexity | Not supported (hardcoded at spawn) | `{"type":"set_model",...}` |
| Run a shell command and feed output back into context | Not supported | `{"type":"bash","command":"..."}` |

### 4.2 What does NOT change

Keep the job-directory-per-task model from the existing controller — it's a
good design and both Claude Code and Codex already know how to use it (thin
plugin commands shelling into a controller script, one job dir per task under
`.agent_runs/pi/<job_id>/`). RPC does not replace this; it replaces *how the
controller talks to the running Pi process inside a job*, not the job
lifecycle/artifact model around it.

Keep: `status.json`, `git_diff.patch`, `result.md`, `verify.log`, and the
`setup / run / status / logs / result / cancel / verify` command names and
shapes where they still make sense. Extend `feedback` and `questions` to be
backed by real RPC events instead of text-scraping (see §4.3). Add new state
that RPC actually gives you (current tool call in progress, turn count,
whether the agent is idle vs streaming) to `status.json` — this is a strict
upgrade, not a breaking change to the schema.

### 4.3 Question/answer loop, done properly

Two real signals now exist instead of one crude regex:
1. **Structured events.** Watch the RPC event stream for whatever Pi emits
   when it wants clarification (check `get_commands`/event types at build
   time — do not assume `ask_user`-shaped events exist since `--no-extensions`
   still applies; confirm empirically what a plain-text "I have a question"
   turn looks like over RPC before designing the detector).
2. **Prompt-engineered structured markers**, as a supplement: instruct Pi (via
   the system-prompt append from §4.4) that if it needs to ask the calling
   agent something, it must say so in a fenced block, e.g.
   ```
   ```controller-question
   <question text>
   ```
   ```
   and then stop and wait — the controller greps for this fence in streamed
   text deltas, which is far more reliable than guessing from `?`-terminated
   lines or keyword regexes.

Once a question is detected, the controller uses `{"type":"prompt", "message":
"<answer>", "streamingBehavior":"steer"}` (or queues it if the turn already
ended) to deliver the reply live, in the *same* RPC session — no more
"job already exited, start a whole new job with a reconstructed instruction"
fallback for this case. Keep `continue`-from-a-dead-job as a fallback only for
when the RPC process itself has actually terminated.

### 4.4 Ground Pi in this ecosystem's own rules, every job

Every job the controller starts must use `--append-system-prompt
~/agent-governance/AGENTS.execution.md` (or the RPC-mode equivalent — check
whether RPC mode accepts the same flag at spawn) so Pi actually operates under
the layer/complexity-budget/exception-handling rules already written for it in
this repo, instead of only knowing what the caller happened to type. Do not
duplicate `AGENTS.execution.md`'s content into the controller — reference the
file.

### 4.5 Model/complexity routing

Replace the hardcoded `MODEL` constant with a required `--model`/`--provider`
parameter on `run` (default to `gpt-5.4-mini` via `openai-codex` if the caller
doesn't specify one, matching what's proven to work this session — see the
CAD Design session's own lessons: `--model gpt-5.4-mini` alone resolves to
`azure-openai-responses`, which has no key here; `--provider openai-codex
--model gpt-5.4-mini` is the combination that actually works). Claude Code, as
the director, picks the model per task based on complexity — the controller
must not hardcode this decision away from the caller.

---

## 5. Required capabilities (translate directly into the command surface)

Extend the existing command surface (`setup run status logs questions
feedback continue result cancel verify`) rather than replacing it. Additions:

- **`run`** must accept: `--model <provider/id>` (or `--provider X --model Y`),
  `--tools <list>` / `--exclude-tools <list>` (task-scoped tool access — a
  read-only investigation job should not get `edit`/`write`; see
  `pi_agent_tooling_guide.md` §4 for the exact flag shapes), and a task
  instruction that can be either an inline string or `@path/to/task.md` (per
  §2.3's documented `-p @prompt.md` pattern) so Claude Code can hand Pi a real
  structured task-spec file, not just a string.
- **`status`** must surface, in addition to today's fields: whether the
  session is currently streaming a turn, the last known tool call in
  progress (name + a short arg summary, not full args), and turn count — all
  available from RPC events, none of it available today.
- **`ask` / `steer`** (new, or extend `feedback` to support this mode): send a
  message into a *running* turn via `streamingBehavior: "steer"`, distinct
  from queuing a `follow_up` for after the agent goes idle. The calling agent
  (Claude Code) needs both, and they are different RPC operations — do not
  collapse them into one command that guesses which one you meant.
- **`events` / `logs --json`** (new): expose the raw RPC event stream (or a
  filtered subset) so the calling agent can inspect exactly what happened,
  not just a flattened text log. Keep the existing plain-text `logs`/`stream.log`
  as the human-readable view; add a machine-readable one alongside it.
- **`verify`** — keep exactly as-is (§3, "proven to work").

---

## 6. Non-goals for this pass (explicit — do not build these now)

- Do not build a permission/confirmation UI layer. Tool scoping via
  `--tools`/`--exclude-tools` per job is the access-control mechanism for v1.
- Do not attempt to root-cause the silent-hang bug at the Pi-internals level
  (it may be a bug in Pi itself, or in this machine's Node/network stack —
  out of scope for a controller-layer build). Your job is to make the
  controller's *handling* of it as good as RPC allows (real-time detection
  the moment the RPC connection itself shows no activity, immediate `abort` +
  clean retry with a fresh RPC process, rather than the current "wait 5
  minutes then just leave a flag"). If RPC mode itself hangs identically to
  `-p` mode, that is an important, reportable finding — say so plainly, do
  not paper over it.
- Do not build a Pi *extension* (in the `pi.registerTool()`/lifecycle-hook
  sense from `pi_agent_tooling_guide.md` §7) for v1. It's a legitimate future
  enhancement (deeper introspection from inside the Pi process itself) but
  adds real complexity and isn't needed to satisfy this spec's core ask.
  Note it as a stretch goal in your final report, don't build it.
- Do not touch or fork `codex-plugin-cc/plugins/codex/` (the Codex-facing
  half of that repo). This build is scoped to the Pi-controlling half only.
  **Decision (locked in, 2026-07-09): extend `codex-plugin-cc/.agent_control/`
  + `codex-plugin-cc/plugins/pi/` in place.** Do not build a new sibling
  location under `~/agent-governance/` and do not create a third, parallel,
  half-migrated system. `codex-plugin-cc` is its own git repo (confirm with
  `git status`/`git remote -v` before committing anything there) — do not
  assume it shares history or a remote with `~/agent-governance` itself, and
  do not push anywhere without separate confirmation.

---

## 7. Deliverables and acceptance criteria

1. Updated/new controller script(s) implementing §4 and §5, with the same
   "small, non-autonomous, caller judges success" philosophy the current
   README states — keep that philosophy explicitly in the new README too.
2. Updated Claude Code plugin commands (`plugins/pi/commands/*.md` or new
   ones) exposing whatever new commands §5 adds.
3. **At least one test that drives the real `pi` binary end-to-end**, not a
   mock — e.g. a genuinely trivial real RPC round-trip (`get_state` on a
   freshly spawned session, expect a real response) that would fail if RPC
   plumbing broke, run in CI-skippable form if it needs real credentials
   (skip cleanly with a clear message if `pi`/credentials aren't available,
   don't silently pass). This directly closes the gap flagged in §2.8/§3.
4. A real, non-trivial smoke test of the full loop: hand Pi a task that reads
   one real file and edits 1-2 real files (ask for a fresh instance of the
   exact kind of task that hung repeatedly in §3 if you want an apples-to-apples
   comparison against the old controller's failure mode), through the new RPC
   path, and report plainly whether it hung, succeeded, or needed a
   steer/question round-trip to complete. Do not claim success without this
   evidence — a working diagnostic on a hang that still happens is real
   progress; report it as exactly that, not as a fix.
5. Updated README(s) documenting: the new RPC-based flow, the model/tool
   routing flags, the question/steer distinction, and — explicitly — the
   current state of the silent-hang problem (fixed, mitigated, or still open
   — whichever is honestly true after step 4).
6. A running issues/decisions log for this build, in the same spirit as
   `ISSUES_FROM_CLAUDE.md` → `CODEX_BUILD_INSTRUCTION.md` → hardening-commit
   cycle that already worked once for the old controller. Do not skip this —
   it's how the next session avoids re-discovering what you already learned.

---

## 8. Extensibility — this is meant to evolve

Leave these doors open, don't necessarily walk through all of them now:

- Versioned job/status schema (a `schema_version` field in `status.json`) so
  future changes don't silently break the plugin commands reading it.
- A place for per-task-type defaults (e.g. "read-only investigation" vs
  "mechanical edit" vs "design exploration" presets for tools/model/thinking
  level) — a config file, not hardcoded branches in the controller.
- The Pi-extension option from §6 as a documented "if you need deeper
  in-process introspection later, here's the pattern" note, not an
  implementation.
- Room for Claude Code itself to eventually be driven the same way Claude
  Code drives Pi (the user's stated long-term interest is a general
  "coding agent you can control" pattern, not something Pi-specific) — don't
  name things `pi_only_...` where a neutral name costs nothing.

---

## 9. When you stop — report format

Produce, at minimum:
- What you built vs. what you extended in place, and where (exact paths).
- Whether the silent-hang problem is fixed, mitigated, or still open under
  RPC — with the real evidence from deliverable #4, not a hope.
- Which of §5's new commands are implemented and verified vs. stubbed.
- The exact real (non-mocked) test(s) you added and their actual output.
- Anything from §6 you found yourself needing to violate, and why.
- A prioritized list of what the *next* build pass should do, in the same
  style as `ISSUES_FROM_CLAUDE.md`'s "Suggested priority for next build
  steps" section.

Do not mark this done if the core silent-hang problem is unaddressed by RPC
too — report that finding clearly instead; it's more valuable than a false
"completed."
