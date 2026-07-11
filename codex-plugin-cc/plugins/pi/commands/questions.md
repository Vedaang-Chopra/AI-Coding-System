---
description: Show recorded Pi clarification prompts for a job
argument-hint: '<job_id>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" questions $ARGUMENTS`

Present the recorded questions exactly. If there are no recorded questions, present the controller output exactly.
