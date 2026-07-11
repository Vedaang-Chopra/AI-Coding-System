---
description: Show active and recent Pi jobs for this repository
argument-hint: ""
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" status`

Render the command output compactly. Preserve job IDs, status, phase, PID, last output time, and stream log path.
