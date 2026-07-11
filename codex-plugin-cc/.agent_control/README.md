# Pi Controller

Shared shell controller for running Pi Coding Agent jobs from Claude Code, Codex, or a normal terminal.

The controller is intentionally small and non-autonomous. It starts exactly the task you pass, records logs and git artifacts, and leaves success judgment to the caller.

## Commands

```bash
node .agent_control/pi_controller.mjs setup
node .agent_control/pi_controller.mjs run "Print exactly: ok"
node .agent_control/pi_controller.mjs run --foreground "Print exactly: ok"
node .agent_control/pi_controller.mjs status
node .agent_control/pi_controller.mjs logs <job_id>
node .agent_control/pi_controller.mjs logs --tail <job_id>
node .agent_control/pi_controller.mjs questions <job_id>
node .agent_control/pi_controller.mjs feedback <job_id> "answer text"
node .agent_control/pi_controller.mjs continue <job_id>
node .agent_control/pi_controller.mjs result <job_id>
node .agent_control/pi_controller.mjs cancel <job_id>
node .agent_control/pi_controller.mjs verify <job_id> "npm test"
```

## Pi Invocation

Every job uses the local `pi` binary:

```bash
pi --model openai/gpt-5.4-mini --no-extensions --no-skills --session-dir "<job_dir>/pi-session" -p "<instruction>"
```

The per-job `--session-dir` prevents concurrent or rapid jobs from sharing Pi's default project session directory under `~/.pi/agent/sessions`.

The controller does not use a hard timeout. If Pi is quiet for several minutes, `status.json` moves `phase` to `no-output-warning`, but the job is left running. Use `cancel` when the caller decides the job should stop.
When the no-output threshold is crossed, the controller records CPU and network diagnostics in `stuck_diagnostics.log` and sets `status.json.likely_stuck` to `true`, `false`, or `null`.

## Run Modes

| Mode | Command | Use when |
|---|---|---|
| Background | `node .agent_control/pi_controller.mjs run "<task>"` | Claude or Codex should avoid filling its context window with a long stream. |
| Foreground | `node .agent_control/pi_controller.mjs run --foreground "<task>"` | You are testing the controller or want to watch output live. |
| Follow logs | `node .agent_control/pi_controller.mjs logs --tail <job_id>` | You want terminal streaming after starting a background job. |
| Answer Pi | `node .agent_control/pi_controller.mjs feedback <job_id> "<reply>"` | Pi is waiting on clarification and the controlling agent should answer. |
| Continue after exit | `node .agent_control/pi_controller.mjs continue <job_id>` | Pi already exited after asking, and Codex wants to relaunch with recorded feedback. |
| Verify | `node .agent_control/pi_controller.mjs verify <job_id> "<command>"` | The controlling agent, not Pi, decides whether the result passes. |

## Job Files

Each run creates:

```text
.agent_runs/pi/<job_id>/
  instruction.txt
  stdout.log
  stderr.log
  stream.log
  pid.txt
  status.json
  exit_code.txt
  git_status_before.txt
  git_status_after.txt
  git_diff.patch
  verify.log
  result.md
  questions.jsonl
  feedback.jsonl
  stuck_diagnostics.log
  pi-session/
```

`stream.log` is the combined timestamped output stream. `stdout.log` and `stderr.log` are preserved separately. `git_diff.patch` captures the repo diff after Pi exits.
`questions.jsonl` records likely Pi clarification prompts. `feedback.jsonl` records controller-supplied replies, and live jobs receive those replies on Pi's stdin.
`stuck_diagnostics.log` records `ps` and `lsof` snapshots when Pi produces no output past the warning threshold.

## Controller Rules

- The task instruction comes from the caller.
- Pi does not choose the next project task.
- The controller does not silently retry failed jobs.
- Stderr is always written to `stderr.log` and included in `stream.log`.
- Previous job directories are never deleted.
- RPC is not implemented in this controller yet.
- Question detection only catches question-like text that Pi prints. A completely silent hang will not produce an `awaiting-feedback` phase; use `likely_stuck` and `stuck_diagnostics.log` for that case.

## Claude Code Slash Commands

The `plugins/pi` Claude Code plugin exposes thin wrappers:

```text
/pi:setup
/pi:run
/pi:status
/pi:logs
/pi:questions
/pi:feedback
/pi:continue
/pi:result
/pi:cancel
/pi:verify
```

Those commands call this controller. Keep controller logic here so Claude Code and Codex use the same behavior.
