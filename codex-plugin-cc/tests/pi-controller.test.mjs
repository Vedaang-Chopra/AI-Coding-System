import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = (() => {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
  });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : PACKAGE_ROOT;
})();
const CONTROLLER = path.join(PACKAGE_ROOT, ".agent_control", "pi_controller.mjs");

function runController(args, env) {
  return spawnSync(process.execPath, [CONTROLLER, ...args], {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function parseJobId(output) {
  const match = output.match(/^job_id:\s*(\S+)/m);
  assert.ok(match, `missing job_id in output:\n${output}`);
  return match[1];
}

function waitForStatus(jobId, expectedStatus, env) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const status = runController(["status"], env);
    assert.equal(status.status, 0, status.stderr);
    const line = status.stdout.split(/\r?\n/).find((entry) => entry.startsWith(`${jobId}\t`));
    if (line?.includes(`\t${expectedStatus}\t`)) {
      return line;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  assert.fail(`job ${jobId} did not reach ${expectedStatus}`);
}

function readJobStatus(jobId) {
  const statusPath = path.join(REPO_ROOT, ".agent_runs", "pi", jobId, "status.json");
  try {
    return JSON.parse(fs.readFileSync(statusPath, "utf8"));
  } catch (error) {
    throw new Error(`failed to read job status at ${statusPath}: ${error.message}`);
  }
}

function makeFakePi(source, extraBins = {}) {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-pi-bin-"));
  const fakePi = path.join(binDir, "pi");
  fs.writeFileSync(fakePi, source, "utf8");
  fs.chmodSync(fakePi, 0o755);
  for (const [name, binSource] of Object.entries(extraBins)) {
    const file = path.join(binDir, name);
    fs.writeFileSync(file, binSource, "utf8");
    fs.chmodSync(file, 0o755);
  }
  return {
    PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    PI_CONTROLLER_FEEDBACK_POLL_MS: "50",
  };
}

test("pi controller can feed queued feedback to a live Pi process", () => {
  const env = makeFakePi(`#!/usr/bin/env node
if (process.argv.includes("--version")) {
  console.log("fake-pi 1.0.0");
  process.exit(0);
}
if (process.argv.includes("--help")) {
  console.log("fake pi help");
  process.exit(0);
}
if (process.argv.includes("--list-models")) {
  console.log("openai/gpt-5.4-mini");
  process.exit(0);
}
console.log("Question: what word should I print?");
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (input.includes("\\n")) {
    console.log("answer:" + input.trim());
    process.exit(0);
  }
});
setTimeout(() => {
  console.error("timed out waiting for feedback");
  process.exit(2);
}, 10000);
`);
  const run = runController(["run", "ask for a word"], env);
  assert.equal(run.status, 0, run.stderr);
  const jobId = parseJobId(run.stdout);

  let sawQuestion = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const questions = runController(["questions", jobId], env);
    assert.equal(questions.status, 0, questions.stderr);
    if (questions.stdout.includes("what word should I print?")) {
      sawQuestion = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  assert.equal(sawQuestion, true);

  const feedback = runController(["feedback", jobId, "hello-from-codex"], env);
  assert.equal(feedback.status, 0, feedback.stderr);
  assert.match(feedback.stdout, /feedback_queued/);

  waitForStatus(jobId, "completed", env);
  const logs = runController(["logs", jobId], env);
  assert.equal(logs.status, 0, logs.stderr);
  assert.match(logs.stdout, /feedback sent to pi stdin/);
  assert.match(logs.stdout, /answer:hello-from-codex/);
});

test("pi controller can continue an exited job with recorded feedback", () => {
  const env = makeFakePi(`#!/usr/bin/env node
const prompt = process.argv.at(-1) || "";
if (process.argv.includes("--version")) {
  console.log("fake-pi 1.0.0");
  process.exit(0);
}
if (process.argv.includes("--help")) {
  console.log("fake pi help");
  process.exit(0);
}
if (process.argv.includes("--list-models")) {
  console.log("openai/gpt-5.4-mini");
  process.exit(0);
}
if (prompt.includes("Controller feedback to apply:")) {
  console.log("continued with recorded feedback");
  process.exit(0);
}
console.log("Question: choose a color?");
process.exit(0);
`);

  const run = runController(["run", "--foreground", "ask for a color"], env);
  assert.equal(run.status, 0, run.stderr);
  const previousJobId = parseJobId(run.stdout);

  const feedback = runController(["feedback", previousJobId, "blue"], env);
  assert.equal(feedback.status, 0, feedback.stderr);
  assert.match(feedback.stdout, /feedback_recorded/);
  assert.match(feedback.stdout, /continue: node \.agent_control\/pi_controller\.mjs continue/);

  const continuation = runController(["continue", "--foreground", previousJobId], env);
  assert.equal(continuation.status, 0, continuation.stderr);
  const continuationJobId = parseJobId(continuation.stdout);
  const logs = runController(["logs", continuationJobId], env);
  assert.equal(logs.status, 0, logs.stderr);
  assert.match(logs.stdout, /continuation of/);
  assert.match(logs.stdout, /continued with recorded feedback/);
});

test("pi controller passes a unique session directory to each Pi job", () => {
  const env = makeFakePi(`#!/usr/bin/env node
if (process.argv.includes("--version")) {
  console.log("fake-pi 1.0.0");
  process.exit(0);
}
if (process.argv.includes("--help")) {
  console.log("fake pi help");
  process.exit(0);
}
if (process.argv.includes("--list-models")) {
  console.log("openai/gpt-5.4-mini");
  process.exit(0);
}
const sessionIndex = process.argv.indexOf("--session-dir");
console.log("session-dir:" + process.argv[sessionIndex + 1]);
process.exit(0);
`);

  const first = runController(["run", "first session test"], env);
  const second = runController(["run", "second session test"], env);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const firstJobId = parseJobId(first.stdout);
  const secondJobId = parseJobId(second.stdout);
  waitForStatus(firstJobId, "completed", env);
  waitForStatus(secondJobId, "completed", env);

  const firstStatus = readJobStatus(firstJobId);
  const secondStatus = readJobStatus(secondJobId);
  assert.notEqual(firstStatus.pi_session_dir, secondStatus.pi_session_dir);
  assert.match(firstStatus.command, /--session-dir/);
  assert.match(secondStatus.command, /--session-dir/);

  const firstLogs = runController(["logs", firstJobId], env);
  const secondLogs = runController(["logs", secondJobId], env);
  assert.match(firstLogs.stdout, new RegExp(`session-dir:${firstStatus.pi_session_dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(secondLogs.stdout, new RegExp(`session-dir:${secondStatus.pi_session_dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("pi controller marks a silent zero-activity Pi process as likely stuck", () => {
  const env = makeFakePi(`#!/usr/bin/env node
if (process.argv.includes("--version")) {
  console.log("fake-pi 1.0.0");
  process.exit(0);
}
if (process.argv.includes("--help")) {
  console.log("fake pi help");
  process.exit(0);
}
if (process.argv.includes("--list-models")) {
  console.log("openai/gpt-5.4-mini");
  process.exit(0);
}
setTimeout(() => process.exit(0), 10000);
`, {
    ps: `#!/usr/bin/env node
console.log("  0.0");
`,
    lsof: `#!/usr/bin/env node
process.exit(1);
`,
  });
  env.PI_CONTROLLER_NO_OUTPUT_WARNING_MS = "100";

  const run = runController(["run", "silent stuck test"], env);
  assert.equal(run.status, 0, run.stderr);
  const jobId = parseJobId(run.stdout);

  let status;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    status = readJobStatus(jobId);
    if (status.likely_stuck === true) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  assert.equal(status.likely_stuck, true);
  assert.equal(status.stuck_diagnostic.cpu_percent, 0);
  assert.equal(status.stuck_diagnostic.network_connection_count, 0);

  const logs = runController(["logs", jobId], env);
  assert.match(logs.stdout, /likely stuck/);
  const diagnostics = fs.readFileSync(status.stuck_diagnostics_path, "utf8");
  assert.match(diagnostics, /no-output diagnostic/);

  const cancel = runController(["cancel", jobId], env);
  assert.equal(cancel.status, 0, cancel.stderr);
});
