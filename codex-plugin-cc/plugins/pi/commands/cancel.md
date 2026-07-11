---
description: Cancel a running Pi job
argument-hint: '<job_id>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" cancel $ARGUMENTS`

Present the cancellation result exactly. Do not restart the job automatically.
