---
description: Run a Pi Coding Agent job through the shared controller
argument-hint: '[--foreground] <task>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" run "$ARGUMENTS"`

Present the job ID and log paths exactly. For long jobs, tell the user to inspect `/pi:logs --tail <job_id>` instead of streaming the full run into chat. If Pi is waiting on clarification, answer it with the shared controller's `feedback` command.
