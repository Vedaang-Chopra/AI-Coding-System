---
description: Send feedback to a live Pi job through the shared controller
argument-hint: '<job_id> "<reply>"'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" feedback $ARGUMENTS`

Present the feedback result exactly. Do not invent additional replies or retry automatically.
