# Pi Agent Tooling Guide

**Audience:** humans and coding agents that want to use this machine's existing Pi coding agent setup to execute tasks.

**Purpose:** explain how to run Pi as a terminal coding harness, how to load its local capabilities, and how to coordinate Pi from another agent without inventing unsupported behavior.

**Primary local references used:** `AGENTS.md`, `AGENTS.execution.md`, `AGENTS.planning.md`, `SYSTEM_OVERVIEW.md`, `docs/ai_context/AGENT_EXECUTION_LOG.md`, `templates/DOC_TAXONOMY.md`, `templates/CODEBASE_MAP.md`, `templates/SYSTEM_WORKFLOW_MAP.md`, and the installed Pi docs under `@earendil-works/pi-coding-agent`.

---

## 1. If You Are Another Coding Agent, Start Here

Pi is installed as a terminal command:

```bash
pi --help
```

Use Pi when you want a local coding agent to operate in a real working directory with file and shell tools. Pi is not a remote service by default. It runs as the local user who starts the `pi` process.

Minimum safe patterns:

```bash
# Read-only review: no writes, no shell mutations.
pi --tools read,grep,find,ls -p "Review this repository and report issues."

# One-shot execution with project-local resources trusted for this run.
pi --approve -p "Read the task docs and execute the next approved task."

# One-shot execution while ignoring project-local settings/resources.
pi --no-approve -p "Inspect only global context and summarize the repository."

# Clean-room run: disable discovered extensions, skills, prompts, themes, and context files.
pi --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files -p "Answer from the explicit prompt only."

# Use only a specific extension file for this run.
pi --no-extensions -e ./my-extension.ts -p "Use the extension if relevant."
```

Before delegating real work to Pi in this governance repo, remember the local rules:

- Read `AGENTS.md` and the correct extension file for the role.
- Planning agents read `AGENTS.planning.md`; execution agents read `AGENTS.execution.md`.
- Run `git status` before modifying tracked files.
- Do not touch secrets or destructive commands without human confirmation.
- Update `docs/ai_context/AGENT_EXECUTION_LOG.md` after task completion in this checkout.

---

## 2. What Pi Is

Pi is a minimal terminal coding harness. It gives a model a local working directory, a system prompt, context files, sessions, and tools. Pi's default editing loop is deliberately small: the model talks, calls tools, sees results, and continues.

Pi solves these problems:

- Let an LLM inspect and edit a real source tree from the terminal.
- Persist session history as JSONL so work can be continued, forked, exported, or inspected.
- Load local instructions and reusable capabilities without putting every instruction in the initial prompt.
- Let users extend behavior through TypeScript extensions, Agent Skills, prompt templates, themes, and packages.
- Provide programmatic modes for other tools and agents to drive Pi.

Pi intentionally does not include some workflows as core features:

| Not built into Pi core | Supported approach |
|---|---|
| Subagents | Spawn `pi` subprocesses, use RPC/SDK, or install/build an extension/package that creates worker agents. |
| Plan mode | Write plans to files, or use/build a plan-mode extension/package. |
| Permission popups | Use an extension such as a `tool_call` gate with `ctx.ui.confirm`, or run Pi in an external sandbox. |
| Background bash | Use `tmux`, an external process supervisor, or an extension that manages a session-scoped process. |
| Built-in MCP | Use extensions/packages or other external tools when MCP-style integrations are needed. |
| Built-in to-dos | Use repository task files or build a stateful extension. |

Pi docs explicitly frame these omissions as intentional. Do not assume those features exist unless a local package or extension provides them.

### Run Modes

| Mode | Command shape | Best use |
|---|---|---|
| Interactive TUI | `pi` | Human-supervised work, live steering, `/` commands, model switching, trust prompts. |
| Print/text | `pi -p "task"` | One-shot subprocess delegation from another agent or script. |
| JSON event stream | `pi --mode json -p "task"` | Headless runs where the caller parses event lines. |
| RPC | `pi --mode rpc` | Long-lived subprocess controlled by JSONL commands over stdin/stdout. |
| SDK | `createAgentSession(...)` | Node/TypeScript applications embedding Pi directly without subprocess protocol overhead. |

Use interactive mode for human-in-the-loop work. Use `-p` when a parent agent wants one result and can treat Pi as a command. Use RPC when the parent process needs to steer, inspect state, run bash commands, or monitor streaming events. Use the SDK when the parent is a Node/TypeScript application and should create sessions directly.

---

## 3. How Pi Loads Capabilities

Pi builds its runtime from several resource classes: context files, settings, extensions, skills, prompt templates, themes, packages, models, credentials, and sessions.

### Context Files

Pi loads `AGENTS.md` or `CLAUDE.md` at startup from:

- `~/.pi/agent/AGENTS.md` for global instructions.
- Parent directories walking up from the current working directory.
- The current directory.

Disable this with:

```bash
pi --no-context-files -p "Ignore AGENTS.md/CLAUDE.md discovery."
```

In this repo, `AGENTS.md` is the global governance source of truth. The file says all agents must read relevant local files first, follow git safety rules, and treat execution decisions as task/spec driven.

### System Prompt Files

Pi can replace or append to its default system prompt with:

- Project `.pi/SYSTEM.md`
- Global `~/.pi/agent/SYSTEM.md`
- Project/global `APPEND_SYSTEM.md`
- CLI `--system-prompt <text>`
- CLI `--append-system-prompt <text>`

Context files and skills can still be appended around a custom prompt. Do not assume `--system-prompt` means no other context exists unless context/resources are also disabled.

### Settings

Pi settings load from:

1. Global `~/.pi/agent/settings.json`
2. Project `.pi/settings.json`

Project settings override global settings after the project is trusted. Settings can list packages, extension paths, skill paths, prompt paths, themes, defaults, and trust behavior.

Useful inspection commands:

```bash
pi list
pi config
```

`pi list` shows installed packages from settings. `pi config` opens the resource enable/disable UI.

### Project Trust

Project trust controls whether Pi loads project-local settings, resources, packages, and extensions. It is an input-loading guard, not a sandbox.

Project resources that require trust include:

- `.pi/settings.json`
- `.pi/extensions`
- `.pi/skills`
- `.pi/prompts`
- `.pi/themes`
- project `.agents/skills`
- project-local package-managed resources

Trust decisions are stored in `~/.pi/agent/trust.json`. Interactive mode can ask. Non-interactive modes do not show trust prompts, so another agent must choose deliberately:

```bash
# Trust project-local resources for this run.
pi --approve -p "Use project resources and execute the task."

# Ignore project-local resources for this run.
pi --no-approve -p "Ignore project-local resources and inspect only safe context."
```

Important: `AGENTS.md` and `CLAUDE.md` context files load regardless of project trust unless disabled with `--no-context-files`.

### Resource Discovery Cheat Sheet

| Resource | Global locations | Project locations | CLI option | Disable discovery |
|---|---|---|---|---|
| Extensions | `~/.pi/agent/extensions/*.ts`, `~/.pi/agent/extensions/*/index.ts` | `.pi/extensions/*.ts`, `.pi/extensions/*/index.ts` after trust | `-e`, `--extension` | `--no-extensions` |
| Skills | `~/.pi/agent/skills`, `~/.agents/skills` | `.pi/skills`, `.agents/skills` in cwd/ancestors after trust | `--skill <path>` | `--no-skills` |
| Prompt templates | `~/.pi/agent/prompts/*.md` | `.pi/prompts/*.md` after trust | `--prompt-template <path>` | `--no-prompt-templates` |
| Themes | `~/.pi/agent/themes` through settings/packages | `.pi/themes` after trust | `--theme <path>` | `--no-themes` |
| Packages | `~/.pi/agent/settings.json` | `.pi/settings.json` after trust | `pi install`, `-e` for temporary package | Filter with `pi config` or settings |

---

## 4. Built-in Tools

Pi's default tools are:

| Tool | Purpose | Notes |
|---|---|---|
| `read` | Read file contents | Prefer for file inspection inside Pi. |
| `write` | Create or overwrite files | Mutating; use only when task scope allows. |
| `edit` | Exact text replacement edits | Mutating; returns diffs/patch details. |
| `bash` | Execute shell commands | Runs with local user permissions. |

Additional built-in read-only tools exist but are off by default:

| Tool | Purpose |
|---|---|
| `grep` | Search file contents. |
| `find` | Find files by glob. |
| `ls` | List directories. |

Tool control examples:

```bash
# Read-only tool set.
pi --tools read,grep,find,ls -p "Audit the code without changing files."

# Only read and bash.
pi --tools read,bash -p "Run diagnostics but do not edit files."

# Disable all tools.
pi --no-tools -p "Answer using prompt context only."

# Disable built-ins but keep extension/custom tools.
pi --no-builtin-tools -e ./tool-extension.ts -p "Use extension tools only."

# Exclude a risky or irrelevant tool.
pi --exclude-tools bash -p "Inspect and edit without shell commands."
```

Use built-in tools when the task is basic local coding: read, edit, write, run tests. Use shell commands for project toolchains and quick repo inspection. Use extensions when a workflow needs policy, UI, remote operations, structured outputs, persistent state, or custom integrations.

Extensions can override built-in tools by registering the same tool name. In interactive mode Pi warns about this. Another agent should not assume `read` or `bash` is the stock implementation if local extensions are active. Use a clean-room command when exact defaults matter:

```bash
pi --no-extensions --no-builtin-tools -e ./known-tools.ts -p "Use only known tool implementations."
```

---

## 5. Running Pi From Another Agent

### Option A: Subprocess CLI

Use this when a parent agent wants a simple one-shot worker.

```bash
pi --approve --name "worker-doc-audit" -p "Read AGENTS.md, inspect docs, and produce a concise audit."
```

Recommended fields to pass:

| Need | CLI option |
|---|---|
| Task prompt | final positional message or `@prompt.md` |
| Working directory | run the subprocess with the desired `cwd` |
| Model | `--model <provider/model>` or `--provider <name> --model <id>` |
| Session naming | `--name "task name"` |
| Session reuse | `--session <path|id>`, `--session-id <id>`, `--continue`, `--fork <path|id>` |
| Session isolation | `--session-dir <dir>` or `--no-session` |
| Trust | `--approve` or `--no-approve` |
| Tools | `--tools`, `--exclude-tools`, `--no-tools`, `--no-builtin-tools` |
| Resources | `-e`, `--skill`, `--prompt-template`, `--no-*` resource flags |

Examples:

```bash
# Run with explicit prompt file and image/file references.
pi --approve -p @docs/tasks/002_next_task.md "Execute this task exactly."

# Use a fixed session id so a parent process can resume it later.
pi --session-id pi-worker-docs --name "Pi worker docs" -p "Start the guide update."

# Resume the same session.
pi --session pi-worker-docs -p "Continue and report current status."

# Use a private session directory for automation.
pi --session-dir /tmp/pi-worker-sessions --name "isolated worker" -p "Inspect the repo."

# Ephemeral run, no saved session.
pi --no-session -p "Return only the answer."
```

Limitations of subprocess `-p`:

- The caller gets final output, not a rich control channel.
- Mid-run steering is awkward unless the subprocess is interactive.
- Trust prompts do not appear in non-interactive mode.
- Long-running work should be supervised externally, for example with `tmux`.

### Option B: RPC Mode

Use RPC when the parent agent needs a long-lived worker it can steer, inspect, abort, or query.

Start:

```bash
pi --mode rpc --approve --name "rpc-worker" --session-id rpc-worker-docs
```

RPC uses JSON lines over stdin/stdout. Send one JSON object per line.

Basic commands:

```json
{"id":"1","type":"get_state"}
{"id":"2","type":"get_commands"}
{"id":"3","type":"prompt","message":"Read AGENTS.md and summarize the execution rules."}
```

Steer while the agent is running:

```json
{"id":"4","type":"prompt","message":"Stop changing scope; focus only on docs.","streamingBehavior":"steer"}
```

Queue follow-up work:

```json
{"id":"5","type":"follow_up","message":"After finishing, run git diff --check and summarize the result."}
```

Run shell output into the next prompt context:

```json
{"id":"6","type":"bash","command":"git status --short"}
{"id":"7","type":"prompt","message":"Use the git status output and tell me what changed."}
```

Useful RPC commands:

| Command | Use |
|---|---|
| `prompt` | Send or queue a user prompt. |
| `steer` | Queue steering after current tool calls. |
| `follow_up` | Queue work after the agent becomes idle. |
| `abort` | Abort current agent operation. |
| `get_state` | Inspect model, session, streaming, queue, compaction state. |
| `get_messages` | Retrieve conversation messages. |
| `get_commands` | List extension commands, prompt templates, and skills visible to RPC. |
| `set_model` | Switch provider/model. |
| `set_thinking_level` | Set reasoning level. |
| `bash` | Execute shell and include output in the next prompt context. |
| `compact` | Manually compact context. |
| `set_session_name` | Name the worker session. |
| `switch_session`, `fork`, `clone` | Replace or branch session state. |

RPC events stream asynchronously. Watch for `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_update`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `queue_update`, `compaction_start`, `compaction_end`, and `extension_error`.

Notes:

- Built-in TUI commands such as `/settings` are not returned by RPC `get_commands` and are not meant to execute through `prompt`.
- Extension commands, prompt templates, and skills are returned by `get_commands`.
- Skill and prompt-template expansion happens before sending/queueing prompt content.

### Option C: SDK

Use the SDK when the parent controller is a Node/TypeScript application. The SDK avoids JSONL subprocess protocol overhead and gives direct event subscriptions.

Minimal pattern:

```typescript
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  cwd: process.cwd(),
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
  tools: ["read", "grep", "find", "ls"],
});

session.subscribe((event) => {
  if (
    event.type === "message_update" &&
    event.assistantMessageEvent.type === "text_delta"
  ) {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("Review this repository without editing files.");
```

Use `AgentSession` for a single active session:

- `prompt(text)`
- `steer(text)`
- `followUp(text)`
- `subscribe(listener)`
- `setModel(model)`
- `setThinkingLevel(level)`
- `compact()`
- `abort()`
- `messages`, `model`, `thinkingLevel`, `isStreaming`

Use `AgentSessionRuntime` when the controller needs session replacement flows:

- `newSession()`
- `switchSession()`
- `fork()`
- clone via `fork(entryId, { position: "at" })`
- `importFromJsonl()`

Important SDK footgun: after session replacement, `runtime.session` changes and subscriptions are attached to the old session. Re-subscribe and re-bind extensions for the replacement session.

### Option D: Extension-Driven Worker Agent

Use an extension when Pi itself should expose a tool or command that launches a worker.

Pattern:

1. Create an extension in `~/.pi/agent/extensions/` or trusted `.pi/extensions/`.
2. Register a command or tool.
3. In the handler, call `pi.exec("pi", [...])` or use Node process APIs.
4. Pass a clear prompt, cwd, session naming, trust mode, and tool restrictions.
5. Return a truncated summary and path to full logs if output is long.

Skeleton:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "run_pi_worker",
    label: "Run Pi Worker",
    description: "Launch a one-shot Pi worker in the current project.",
    parameters: Type.Object({
      task: Type.String(),
      readOnly: Type.Optional(Type.Boolean()),
    }),
    async execute(_id, params, signal, _onUpdate, ctx) {
      const tools = params.readOnly ? "read,grep,find,ls" : "read,bash,edit,write";
      const result = await pi.exec(
        "pi",
        ["--approve", "--tools", tools, "--no-session", "-p", params.task],
        { signal, cwd: ctx.cwd, timeout: 600000 },
      );

      if (result.code !== 0) {
        throw new Error(result.stderr || `pi worker exited ${result.code}`);
      }

      return {
        content: [{ type: "text", text: result.stdout }],
        details: { code: result.code },
      };
    },
  });
}
```

If the worker tool mutates files itself, use Pi's file mutation queue helpers. If it only launches a worker process, isolate the worker through session names, working trees, or external process control.

---

## 6. Skills

Skills are self-contained capability packages using the Agent Skills pattern. They give the model specialized instructions, setup steps, scripts, references, and assets. Pi loads only skill names/descriptions initially; the model reads full `SKILL.md` on demand.

Locations:

- Global: `~/.pi/agent/skills/`
- Global shared: `~/.agents/skills/`
- Project after trust: `.pi/skills/`
- Project shared after trust: `.agents/skills/` in cwd and ancestors
- Packages: `skills/` directories or `pi.skills` manifest entries
- Settings: `skills` array
- CLI: `--skill <path>`

Discovery rules:

- Direct `.md` files under `~/.pi/agent/skills/` and `.pi/skills/` are individual skills.
- Directories containing `SKILL.md` are discovered recursively.
- Root `.md` files under `~/.agents/skills/` and project `.agents/skills/` are ignored.

Invoke from interactive or RPC prompt:

```text
/skill:brave-search
/skill:pdf-tools extract these files
```

Load one explicitly:

```bash
pi --no-skills --skill ./skills/my-skill/SKILL.md -p "/skill:my-skill Run the workflow."
```

Use a skill when:

- The model needs a repeatable method or checklist.
- The task benefits from helper scripts or reference docs loaded on demand.
- No new runtime tool is needed.

Use an extension instead when:

- You need a callable tool with structured parameters.
- You need to intercept tool calls, model events, or user input.
- You need UI, session hooks, provider registration, or process control.

Use a package when:

- You want to bundle skills with extensions, prompts, and themes for reuse.

---

## 7. Extensions

Extensions are TypeScript modules that run inside Pi with full local user permissions. They can alter Pi behavior at runtime.

Core capabilities:

- Register custom tools with `pi.registerTool()`.
- Register slash commands with `pi.registerCommand()`.
- Register shortcuts and CLI flags.
- Intercept lifecycle events.
- Block or mutate tool calls.
- Modify tool results.
- Inject messages or system prompt changes.
- Add UI with `ctx.ui`.
- Manage session state with `pi.appendEntry()` or tool result `details`.
- Override built-in tools.
- Register providers and models.
- Launch external processes with `pi.exec()`.

Locations:

```text
~/.pi/agent/extensions/*.ts
~/.pi/agent/extensions/*/index.ts
.pi/extensions/*.ts
.pi/extensions/*/index.ts
```

Project extensions load only after trust. Test a temporary extension with:

```bash
pi -e ./my-extension.ts
```

Hot reload:

```text
/reload
```

Use `/reload` for extensions in auto-discovered locations. A `-e` file is better for quick tests.

Important lifecycle events:

| Event | Use |
|---|---|
| `project_trust` | Decide or defer project trust from global/CLI extensions. |
| `resources_discover` | Add skill, prompt, or theme paths. |
| `session_start` | Initialize session-scoped state. |
| `session_shutdown` | Clean up resources. |
| `session_before_switch` | Cancel or prepare `/new` and `/resume`. |
| `session_before_fork` | Cancel or prepare `/fork` and `/clone`. |
| `before_agent_start` | Inject context or modify system prompt. |
| `context` | Modify messages before an LLM call. |
| `tool_call` | Block or mutate a tool call before execution. |
| `tool_result` | Modify tool results. |
| `input` | Transform or handle raw user input before skill/template expansion. |
| `user_bash` | Intercept `!` and `!!` shell commands. |
| `model_select` | React to model changes. |

`ctx.ui` capabilities:

- `select`, `confirm`, `input`, `editor`, `notify`
- `setStatus`, `setWidget`, `setFooter`, `setTitle`
- `setEditorText`, `pasteToEditor`
- `addAutocompleteProvider`
- `custom()` for temporary custom TUI components
- `setEditorComponent()` for custom editor behavior
- theme access and switching

Mode differences:

| Mode | `ctx.mode` | `ctx.hasUI` | Extension UI behavior |
|---|---|---|---|
| Interactive | `tui` | true | Full terminal UI. |
| RPC | `rpc` | true | Dialogs/notifications via RPC protocol; TUI-only custom components are limited. |
| JSON | `json` | false | UI methods are no-ops. |
| Print | `print` | false | Extensions run but cannot prompt. |

Security implications:

- Extensions are code with local user permissions.
- Review third-party extensions before use.
- Project-local extensions load after project trust.
- Extensions are not a sandbox. Use containers, VMs, micro-VMs, or policy tools for real isolation.
- Do not start background processes in extension factory load. Start them in `session_start` or a command/tool and close them in `session_shutdown`.

---

## 8. Packages

Pi packages bundle extensions, skills, prompt templates, and themes for reuse through npm, git, or local paths.

Install examples:

```bash
pi install npm:@foo/bar@1.0.0
pi install git:github.com/user/repo@v1
pi install https://github.com/user/repo
pi install /absolute/path/to/package
pi install ./relative/path/to/package
```

Manage:

```bash
pi list
pi config
pi remove npm:@foo/bar
pi update
pi update --all
pi update --extensions
pi update npm:@foo/bar
```

By default, installs write to global settings. Use `-l` for project-local settings:

```bash
pi install -l ./team-pi-package
```

Project-local package settings are shareable, but Pi installs missing project packages only after project trust.

Try without installing:

```bash
pi -e npm:@foo/bar
pi -e git:github.com/user/repo
```

Package structure:

```text
my-package/
  package.json
  extensions/
  skills/
  prompts/
  themes/
```

Manifest example:

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

Use a package when another agent or team should load the same extension/skill/prompt bundle repeatedly.

---

## 9. Prompt Templates

Prompt templates are Markdown snippets that expand into full prompts. The filename becomes a slash command.

Locations:

- Global: `~/.pi/agent/prompts/*.md`
- Project after trust: `.pi/prompts/*.md`
- Packages: `prompts/` directories or `pi.prompts`
- Settings: `prompts` array
- CLI: `--prompt-template <path>`

Template example:

```markdown
---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes (`git diff --cached`). Focus on:
- Bugs and logic errors
- Security issues
- Error handling gaps
- $ARGUMENTS
```

Usage:

```text
/review
/review "pay special attention to path handling"
```

Arguments:

- `$1`, `$2`, etc. for positional args.
- `$@` or `$ARGUMENTS` for all args.
- `${1:-default}` for defaults.
- `${@:N}` and `${@:N:L}` for slicing.

Use prompt templates for reusable prompt text. Use skills for workflow instructions and assets. Use extensions for runtime behavior or tools.

---

## 10. Practical Workflows for Another Agent

### A. Inspect What Pi Will Load

```bash
pi --verbose --approve -p "Report loaded context files, skills, prompt templates, extensions, active tools, and current model. Do not modify files."
```

For RPC:

```json
{"type":"get_commands"}
{"type":"get_state"}
```

For SDK, use `DefaultResourceLoader`:

```typescript
const loader = new DefaultResourceLoader({ cwd: process.cwd() });
await loader.reload();
console.log(loader.getSkills());
console.log(loader.getPrompts());
console.log(loader.getExtensions());
console.log(loader.getAgentsFiles().agentsFiles);
```

### B. Run a Governance Task Safely

```bash
pi --approve \
  --name "governance-task-002" \
  --tools read,bash,edit,write,grep,find,ls \
  -p "Read AGENTS.md and AGENTS.execution.md. Execute only the approved task in docs/tasks. Update docs/ai_context/AGENT_EXECUTION_LOG.md."
```

### C. Run Read-Only Parallel Reviews

Use separate working trees or read-only tools. Do not run multiple mutating Pi agents against the same checkout.

```bash
pi --session-dir /tmp/pi-review-a --tools read,grep,find,ls -p "Review module A."
pi --session-dir /tmp/pi-review-b --tools read,grep,find,ls -p "Review module B."
```

If true parallel execution is needed, use separate git worktrees:

```bash
git worktree add /tmp/project-review-a HEAD
git worktree add /tmp/project-review-b HEAD
```

Then launch Pi in each worktree.

### D. Add an Extension and Reload It

```bash
mkdir -p ~/.pi/agent/extensions
cp ./my-extension.ts ~/.pi/agent/extensions/my-extension.ts
pi
```

Inside Pi:

```text
/reload
```

For a quick test:

```bash
pi -e ./my-extension.ts
```

### E. Create a Skill for Repeatable Work

```text
~/.pi/agent/skills/my-skill/
  SKILL.md
  scripts/
  references/
```

Start Pi and invoke:

```text
/skill:my-skill
```

Or force only that skill:

```bash
pi --no-skills --skill ~/.pi/agent/skills/my-skill/SKILL.md -p "/skill:my-skill Run this task."
```

### F. Package Resources for Reuse

Create a package with `extensions/`, `skills/`, `prompts/`, and `themes/`, then install:

```bash
pi install ./my-pi-package
pi list
pi config
```

Use `-l` for a project-shared package reference:

```bash
pi install -l ./my-pi-package
```

### G. Build a Custom Tool That Launches a Worker Agent

Use an extension tool like `run_pi_worker`. Pass:

- `cwd`: usually `ctx.cwd`
- task prompt
- trust choice
- tool allowlist
- session name or `--no-session`
- timeout
- output truncation strategy

Recommended worker flags for risky tasks:

```bash
pi --approve --tools read,grep,find,ls --no-session -p "Read-only worker task."
```

Recommended worker flags for implementation tasks:

```bash
pi --approve --name "worker-implementation" --tools read,bash,edit,write,grep,find,ls -p "Execute only the assigned task."
```

### H. Long-Running Work

Pi core does not provide background bash. Use `tmux` or another supervisor:

```bash
tmux new -s pi-worker
pi --approve --name "long-running-worker"
```

Use external logging and session names so another agent can reconnect or inspect state.

---

## 11. Safety and Limits

### No Built-in Sandbox

Pi runs with the permissions of the user account that starts it. Built-in tools can read files, write files, edit files, and run shell commands. Extensions are TypeScript modules with the same permissions.

For untrusted or unattended work, use external isolation:

- container
- VM or micro-VM
- read-only bind mounts
- separate git worktree
- limited credentials
- explicit tool allowlists

### Destructive Commands

In this governance repo, always confirm before:

- `rm -rf`
- `git push`
- `git reset --hard`
- `git clean -fd`
- `sudo`
- commands writing above project root
- commands touching `.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`

### Trust Is Not Permission

Project trust only controls loading project-local Pi resources. It does not prevent a trusted model/tool from running a dangerous command. Use:

- `--tools read,grep,find,ls` for read-only work.
- `--exclude-tools bash` when shell is unnecessary.
- permission-gate extensions for confirmations.
- external sandboxes for real isolation.

### Parallel Agents

Do not let multiple mutating agents operate in the same checkout unless a human explicitly coordinates the file ownership. Safer patterns:

- separate git worktrees
- read-only toolsets
- one writer plus many reviewers
- separate session directories
- explicit task file ownership

### Secrets

Do not pass API keys through CLI arguments. CLI args can be visible through process inspection and shell history. Prefer environment variables, Pi auth storage, or provider login flows. Do not ask Pi to print secret values.

---

## 12. Troubleshooting

### Extension Not Loading

Check:

- Is the file under `~/.pi/agent/extensions/*.ts` or `.pi/extensions/*.ts`?
- If project-local, is the project trusted?
- Did you run `/reload` after adding it?
- Does `pi -e ./extension.ts` load it for a one-off run?
- Does the extension default-export a function receiving `ExtensionAPI`?
- Are runtime dependencies installed near the extension or in the package dependencies?

For a clean test:

```bash
pi --no-extensions -e ./my-extension.ts --verbose
```

### Skill Not Discovered

Check:

- Does the skill directory contain `SKILL.md`?
- Does `SKILL.md` have `name` and `description` frontmatter?
- Is the name lowercase letters, numbers, and hyphens?
- Is the project trusted if the skill is under `.pi/skills` or `.agents/skills`?
- Did you disable skill discovery with `--no-skills`?
- Is there a name collision where an earlier skill won?

Force load:

```bash
pi --skill ./path/to/SKILL.md
```

### Prompt Template Not Visible

Check:

- Is it a `.md` file directly under `.pi/prompts` or `~/.pi/agent/prompts`?
- Template discovery in `prompts/` is non-recursive.
- Is project trust active for project prompts?
- Did you disable prompts with `--no-prompt-templates`?

Force load:

```bash
pi --prompt-template ./prompts/review.md
```

### Package Trust or Install Problems

Check:

- `pi list`
- `pi config`
- global vs project install (`-l`)
- project trust for project package resources
- git refs and network/auth requirements
- npm command wrapper if configured in `settings.json`

Remember: packages can execute arbitrary extension code and skills can instruct the model to run scripts. Review before installing.

### Command or Tool Not Visible

In interactive mode, type `/` for commands. In RPC mode:

```json
{"type":"get_commands"}
```

For tools, an extension can inspect:

```typescript
pi.getAllTools();
pi.getActiveTools();
```

Tool visibility can be affected by:

- `--tools`
- `--exclude-tools`
- `--no-tools`
- `--no-builtin-tools`
- extension load failures
- project trust

### RPC Client Issues

RPC uses strict JSONL over stdin/stdout:

- one JSON object per line
- split only on `\n`
- strip optional trailing `\r`
- correlate command responses with `id`
- events do not include request ids

If the agent is already streaming, use `streamingBehavior` with `prompt`, or use `steer`/`follow_up`.

### Session or Context Problems

Use:

```bash
pi --session <path|id>
pi --fork <path|id>
pi --session-dir <dir>
pi --no-session
```

Inside Pi:

```text
/session
/tree
/compact
/export
```

In RPC:

```json
{"type":"get_state"}
{"type":"get_session_stats"}
{"type":"get_messages"}
{"type":"compact","customInstructions":"Focus on current task state."}
```

If a session replacement happens in SDK or extension command code, discard old session-bound objects and use the replacement-session context.

---

## 13. Quick Reference

### Command Cheat Sheet

| Goal | Command |
|---|---|
| Interactive Pi | `pi` |
| One-shot answer | `pi -p "prompt"` |
| JSON events | `pi --mode json -p "prompt"` |
| RPC worker | `pi --mode rpc` |
| Continue recent session | `pi --continue` |
| Pick session | `pi --resume` |
| Use session | `pi --session <path|id>` |
| Fixed session id | `pi --session-id <id>` |
| Fork session | `pi --fork <path|id>` |
| Ephemeral | `pi --no-session` |
| Read-only tools | `pi --tools read,grep,find,ls` |
| Disable all tools | `pi --no-tools` |
| Disable built-ins | `pi --no-builtin-tools` |
| Load extension | `pi -e ./extension.ts` |
| Load skill | `pi --skill ./skill/SKILL.md` |
| Load prompt template | `pi --prompt-template ./prompt.md` |
| Disable context files | `pi --no-context-files` |
| Trust project for run | `pi --approve` |
| Ignore project resources | `pi --no-approve` |
| Install package | `pi install <source>` |
| Project-local package | `pi install -l <source>` |
| List packages | `pi list` |
| Configure resources | `pi config` |

### File and Folder Cheat Sheet

| Path | Meaning |
|---|---|
| `~/.pi/agent/AGENTS.md` | Global Pi context file. |
| `<project>/AGENTS.md` | Project context file. |
| `~/.pi/agent/settings.json` | Global Pi settings. |
| `<project>/.pi/settings.json` | Project Pi settings after trust. |
| `~/.pi/agent/extensions/` | Global extensions. |
| `<project>/.pi/extensions/` | Project extensions after trust. |
| `~/.pi/agent/skills/` | Global skills. |
| `~/.agents/skills/` | Shared global skills. |
| `<project>/.pi/skills/` | Project skills after trust. |
| `<project>/.agents/skills/` | Shared project skills after trust. |
| `~/.pi/agent/prompts/` | Global prompt templates. |
| `<project>/.pi/prompts/` | Project prompt templates after trust. |
| `~/.pi/agent/sessions/` | Default session storage. |
| `~/.pi/agent/trust.json` | Saved project trust decisions. |
| `~/.pi/agent/auth.json` | Stored credentials. Do not print. |

### Skill vs Extension vs Package vs Prompt Template

| Use when | Choose |
|---|---|
| You need reusable instructions, scripts, and references loaded on demand. | Skill |
| You need a runtime tool, event hook, UI, provider, policy gate, or process control. | Extension |
| You need to distribute a bundle of extensions, skills, prompts, and themes. | Package |
| You need reusable prompt text with arguments. | Prompt template |
| You need one-off behavior for a single run. | CLI flags or direct prompt |

### Subprocess vs RPC vs SDK vs Extension Worker

| Use when | Choose |
|---|---|
| Parent agent wants one answer and can parse stdout. | `pi -p` subprocess |
| Parent agent needs streaming events, steering, state, bash, and command discovery. | `pi --mode rpc` |
| Parent application is Node/TypeScript and should embed Pi directly. | SDK `createAgentSession` |
| Pi should expose a tool/command that delegates to another Pi worker. | Extension worker |
| Human needs to supervise and steer. | Interactive TUI |
| Task is long-running or needs background shell. | `tmux` or external supervisor plus Pi |

---

## 14. Local Governance Notes for This Repo

This repository is the governance repo used by Pi, Codex, and Claude Code. A future Pi worker in this checkout should treat these as binding:

- `AGENTS.md` is the global rule source.
- Pi execution agents read `AGENTS.md` plus `AGENTS.execution.md`.
- Planning agents read `AGENTS.md` plus `AGENTS.planning.md`.
- Task execution should be task-file driven and separately verifiable.
- The live execution log is `docs/ai_context/AGENT_EXECUTION_LOG.md`. Older historical entries may refer to its former path, `docs/AGENT_EXECUTION_LOG.md`.
- Do not create structures, modules, or patterns not specified by the task/spec.
- For docs-only tasks, do not drift into code or package changes.

When coordinating Pi from another coding agent, pass these constraints explicitly in the worker prompt instead of assuming the model will infer them from context.
