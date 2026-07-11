---
description: Continue a prior Pi job with recorded feedback
argument-hint: '[--foreground] <job_id>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" continue $ARGUMENTS`

Present the continuation job ID and log paths exactly. Do not invent additional feedback or retry automatically.
