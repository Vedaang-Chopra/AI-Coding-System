# Plan: Pi RPC Controller Extension
**Spec:** docs/specs/002_pi_controller_rpc_extension.md
**Status:** Confirmed — extend `codex-plugin-cc/.agent_control/` in place (decision locked 2026-07-09)

## Summary

This is a real code build inside `codex-plugin-cc` (its own git repo, nested under
`~/agent-governance/`), not a docs-only change. The core architectural move is
replacing the `-p` subprocess + text-scraping transport in `pi_controller.mjs` with
`pi --mode rpc`, while keeping every existing job-directory/artifact convention that
already works (see spec §3 "proven to work" — do not redesign those parts).

Two investigation steps must happen **before** any controller code changes, because
the spec's own architecture depends on their answers: (1) what RPC's real event
shapes look like for tool calls and question-like turns, empirically, not assumed
from docs; (2) whether the silent-hang bug reproduces under RPC too. Do not skip
straight to implementation — steps 1-2 below are load-bearing for steps 3+.

No changes to `codex-plugin-cc/plugins/codex/` (Codex-facing half) at all. All
changes are under `.agent_control/`, `plugins/pi/`, and `tests/`.

## Files to Modify / Create

| File | What changes |
|---|---|
| `.agent_control/pi_controller.mjs` | Add RPC-mode job spawning (replace/augment `runPiForJob`'s `-p` spawn with `--mode rpc` + JSONL stdin/stdout protocol); parameterize `--model`/`--provider`/`--tools`/`--exclude-tools` on `run` instead of hardcoded `MODEL` const; wire `--append-system-prompt` pointing at `AGENTS.execution.md` (pending step 1's confirmation this flag works in RPC mode); add `ask`/`steer` command (or extend `feedback` with a steer-vs-follow_up distinction); add `events`/`logs --json` machine-readable output; extend `status.json` with `schema_version`, streaming state, current tool call, turn count (additive only — do not remove or rename existing fields) |
| `.agent_control/README.md` | Document the new RPC-based flow, model/tool routing flags, question/steer distinction, and the honest current state of the silent-hang problem after step 2/8's real evidence |
| `.agent_control/RPC_BUILD_LOG.md` (new) | Running issues/decisions log for this build specifically, in the spirit of `ISSUES_FROM_CLAUDE.md` → `CODEX_BUILD_INSTRUCTION.md` — do not overwrite or merge into `ISSUES_FROM_CLAUDE.md`, which is a historical record of a different investigation |
| `plugins/pi/commands/*.md` | Add thin wrapper commands for whatever new subcommands land in `pi_controller.mjs` (e.g. `ask.md`, or extended `feedback.md`; `events.md` or extended `logs.md`) |
| `tests/pi-controller.test.mjs` or new `tests/pi-controller-rpc.test.mjs` | Add at least one test that drives the **real** `pi` binary via RPC (not a `process.exit(...)` fixture) — skip cleanly with a clear message if `pi`/credentials aren't available in the test environment, never silently pass |
| `tests/commands.test.mjs` | Update only if plugin command argument shapes changed |

## Dependency Order

**Phase 0 — empirical investigation (must run first, informs everything after):**
1. By hand, spawn `pi --mode rpc` in a scratch directory, send `{"type":"get_state"}` and `{"type":"get_commands"}`, and record the real response shapes in `RPC_BUILD_LOG.md`. Confirm whether `--append-system-prompt` (or an RPC-mode equivalent) is accepted at spawn time.
2. Send a trivial no-tool-call prompt (`{"type":"prompt","message":"Print exactly: Hello, world!"}`) over that same RPC session and watch the event stream. Record whether it hangs with zero events, same as the `-p` mode jobs in `codex-plugin-cc/.agent_runs/pi/` from 2026-07-08. **This is the single most important empirical result in this build** — it determines whether RPC actually fixes the availability problem or only gives better observability into the same failure.
3. Send a prompt that should provoke a clarifying question (e.g. an intentionally underspecified task) and observe what the raw event stream looks like for that turn, to ground the question-detector design in step 6 below in reality rather than assumption.

*** SYNC POINT: do not proceed past this line until Phase 0's 3 findings are written into `RPC_BUILD_LOG.md` with the actual raw JSON observed, not paraphrased. ***

**Phase 1 — core transport change:**
4. Implement RPC session spawning in `pi_controller.mjs` (spawn `pi --mode rpc`, JSONL read/write over stdin/stdout, correlate command `id`s with responses, subscribe to the async event stream). This replaces `runPiForJob`'s direct `-p` spawn for new jobs; keep the old code path available/documented if Phase 0 step 2 shows RPC doesn't help with the hang (see spec §6: "if RPC mode itself hangs identically to `-p` mode, that is an important, reportable finding — say so plainly").
5. Parameterize model/provider/tools on `run` (replace the hardcoded `MODEL` constant with a CLI arg, default `--provider openai-codex --model gpt-5.4-mini` to match what's proven to work this session).
6. Wire `--append-system-prompt` (or its RPC equivalent, per Phase 0 step 1) to reference `~/agent-governance/AGENTS.execution.md` on every job.

**Phase 2 — question/steer loop (depends on Phase 0 step 3 + Phase 1 step 4):**
7. Implement the structured question marker (fenced ```controller-question``` block) convention in the injected system-prompt append, plus a detector over streamed text deltas from the RPC event stream.
8. Implement `steer` (mid-turn) vs `follow_up` (post-idle) as genuinely distinct RPC-backed operations — do not collapse them into one command.
9. Implement `abort` for clean cancellation via RPC instead of `SIGTERM` on the process group (keep `SIGTERM` as a fallback if the RPC process itself is unresponsive).

**Phase 3 — observability surface (depends on Phase 1 step 4):**
10. Extend `status.json` additively with `schema_version`, current-turn streaming state, in-progress tool call (name + short arg summary), and turn count.
11. Add `events`/`logs --json` exposing the raw or lightly-filtered RPC event stream alongside the existing human-readable `stream.log`.

**Phase 4 — plugin surface + tests (depends on Phases 1-3):**
12. Update `plugins/pi/commands/*.md` for any new subcommands.
13. Add the real (non-mocked) RPC smoke test — a minimal `get_state` round-trip against the actual `pi` binary, skipping cleanly (not silently passing) if `pi` or credentials are unavailable.
14. Add the full real smoke test: a task that reads one real file and edits 1-2 real files, run through the new RPC path. Report plainly whether it hung, succeeded, or needed a steer round-trip — this is spec §7 deliverable #4 and must use real evidence, not a hoped-for outcome.

**Phase 5 — docs + report:**
15. Update `.agent_control/README.md` with the new flow and an honest statement of the hang problem's status.
16. Write the final report per spec §9, including a prioritized list for the next build pass.

## Validation Criteria

- [ ] `RPC_BUILD_LOG.md` contains real, raw JSON event output from Phase 0 steps 1-3 (not paraphrased descriptions)
- [ ] `node .agent_control/pi_controller.mjs run --model <x> --provider <y> "Print exactly: ok"` succeeds without editing controller source to change the model
- [ ] `status.json` for a run started this way contains a `schema_version` field and the new streaming/tool-call/turn-count fields, while every field present before this build is still present with the same meaning
- [ ] A job's `feedback`/`steer` reaches Pi while it is still mid-turn (not only after it exits) — demonstrated, not assumed
- [ ] `npm test` (i.e. `node --test tests/*.test.mjs`) passes, and at least one test in the suite is confirmed (by reading its source, not its name) to spawn the real `pi` binary rather than a `process.exit(...)` fixture script
- [ ] The Phase 4 step 14 real multi-file-edit smoke test has a `git_diff.patch` and `result.md` you can point to as evidence, plus an explicit stated verdict on whether the silent-hang problem reproduced under RPC
- [ ] `.agent_control/README.md` states, in plain language, the current true status of the silent-hang problem (fixed / mitigated / still open) — not omitted, not overstated
- [ ] `git status`/`git remote -v` inside `codex-plugin-cc` was checked before any commit there, and nothing was pushed without separate explicit confirmation
