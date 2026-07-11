---
description: Check the local Pi binary and default model availability
argument-hint: ""
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" setup`

Present the command output exactly. If setup fails, preserve the failing check and stderr detail.
