---
description: Print or tail a Pi job stream log
argument-hint: '[--tail] <job_id>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" logs $ARGUMENTS`

Present the log output exactly. If `--tail` is used, avoid copying large output back into chat unless the user asks for it.
