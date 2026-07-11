---
description: Show a Pi job result summary and artifact paths
argument-hint: '<job_id>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" result $ARGUMENTS`

Present the result, exit code, git diff path, and verify log path exactly.
