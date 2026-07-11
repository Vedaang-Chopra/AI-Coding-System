---
description: Run a verification command for a Pi job from the repo root
argument-hint: '<job_id> "<verify command>"'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/../../.agent_control/pi_controller.mjs" verify $ARGUMENTS`

Present the verification output and verify log path exactly. The verifier decides whether the Pi job succeeded.
