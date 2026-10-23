# Security Policy

## Scope

This repository contains agent instructions, workflow skills, templates, scripts, tests, and a bundled Claude Code/Codex/Pi integration. It is not a hosted service and does not provide a security response SLA.

## Reporting a vulnerability

Please do **not** publish credentials, exploit details, private logs, or sensitive project data in a public issue or pull request.

Use GitHub's private vulnerability reporting for this repository if it is enabled. If it is not available, contact the repository maintainer through a verified private channel before sharing technical details. Include:

- affected file or component and version/commit, if known;
- impact and conditions required to reproduce;
- a minimal reproduction that contains no secrets or unrelated private data;
- any suggested mitigation, if known.

The repository currently does not publish a dedicated security email or response-time commitment. Do not assume a report has been received until the maintainer acknowledges it.

## Handling secrets

Never commit API keys, access tokens, passwords, private keys, or unredacted machine-specific logs. If a credential may have been exposed, revoke or rotate it immediately and report the exposure privately. Removing a secret from the latest commit does not remove it from Git history.
