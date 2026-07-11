---
description: Dispatch Pi controller subcommands from Codex
argument-hint: '<setup|run|status|logs|questions|feedback|continue|result|cancel|verify> [...]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" $ARGUMENTS`

Present the controller output exactly. For long-running jobs, tell the user to inspect `/codex:pi logs --tail <job_id>` instead of streaming the full run into chat. If Pi is waiting on clarification, answer it with `/codex:pi feedback <job_id> "<reply>"`. If Pi already exited after asking, use `/codex:pi continue <job_id>` after recording feedback.
