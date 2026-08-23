#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";

const MODEL = process.env.PI_MODEL;
if (!MODEL) {
  console.error("PI_MODEL env var is required (see config/models.yaml, fast-code role).");
  process.exit(1);
}
const NO_OUTPUT_WARNING_MS = Number(process.env.PI_CONTROLLER_NO_OUTPUT_WARNING_MS || 300000);
const RECENT_LOG_LINES = Number(process.env.PI_CONTROLLER_LOG_LINES || 120);
const FEEDBACK_POLL_MS = Number(process.env.PI_CONTROLLER_FEEDBACK_POLL_MS || 500);

function nowIso() {
  return new Date().toISOString();
}

function controllerPath() {
  return new URL(import.meta.url).pathname;
}

function repoRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return process.cwd();
}

function runsRoot(root = repoRoot()) {
  return path.join(root, ".agent_runs", "pi");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function commandDisplay(instruction, sessionDir = null) {
  const sessionPart = sessionDir ? ` --session-dir ${JSON.stringify(sessionDir)}` : "";
  return `pi --model ${MODEL} --no-extensions --no-skills${sessionPart} -p ${JSON.stringify(instruction)}`;
}

function jobPaths(root, jobId) {
  const dir = path.join(runsRoot(root), jobId);
  return {
    dir,
    instruction: path.join(dir, "instruction.txt"),
    stdout: path.join(dir, "stdout.log"),
    stderr: path.join(dir, "stderr.log"),
    stream: path.join(dir, "stream.log"),
    pid: path.join(dir, "pid.txt"),
    status: path.join(dir, "status.json"),
    exitCode: path.join(dir, "exit_code.txt"),
    gitStatusBefore: path.join(dir, "git_status_before.txt"),
    gitStatusAfter: path.join(dir, "git_status_after.txt"),
    gitDiff: path.join(dir, "git_diff.patch"),
    verify: path.join(dir, "verify.log"),
    result: path.join(dir, "result.md"),
    feedback: path.join(dir, "feedback.jsonl"),
    questions: path.join(dir, "questions.jsonl"),
    piSession: path.join(dir, "pi-session"),
    stuckDiagnostics: path.join(dir, "stuck_diagnostics.log"),
  };
}

function makeJobId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `pi-${stamp}-${random}`;
}

function runCapture(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || repoRoot(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: options.shell || false,
  });
}

function writeCommandOutput(file, command, args, options = {}) {
  const result = runCapture(command, args, options);
  const lines = [
    `$ ${[command, ...args].join(" ")}`,
    "",
    result.stdout || "",
    result.stderr ? `\n[stderr]\n${result.stderr}` : "",
    `\n[exit_code] ${result.status ?? "signal:" + result.signal}`,
    "",
  ];
  fs.writeFileSync(file, lines.join("\n"), "utf8");
  return result;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function append(file, text) {
  fs.appendFileSync(file, text, "utf8");
}

function updateStatus(paths, patch) {
  const current = fs.existsSync(paths.status) ? readJson(paths.status) : {};
  writeJson(paths.status, {
    ...current,
    ...patch,
    updated_at: nowIso(),
  });
}

function createEmptyFiles(paths) {
  for (const file of [
    paths.stdout,
    paths.stderr,
    paths.stream,
    paths.exitCode,
    paths.gitStatusAfter,
    paths.gitDiff,
    paths.verify,
    paths.result,
    paths.feedback,
    paths.questions,
    paths.stuckDiagnostics,
  ]) {
    fs.writeFileSync(file, "", "utf8");
  }
}

function createJob(instruction) {
  const root = repoRoot();
  const jobId = makeJobId();
  const paths = jobPaths(root, jobId);
  ensureDir(paths.dir);
  fs.writeFileSync(paths.instruction, `${instruction}\n`, "utf8");
  createEmptyFiles(paths);
  writeCommandOutput(paths.gitStatusBefore, "git", ["status", "--short", "--untracked-files=all"], { cwd: root });

  const startedAt = nowIso();
  writeJson(paths.status, {
    job_id: jobId,
    repo_root: root,
    pid: null,
    status: "running",
    phase: "created",
    started_at: startedAt,
    updated_at: startedAt,
    last_output_at: null,
    command: commandDisplay(instruction, paths.piSession),
    instruction_path: paths.instruction,
    stdout_path: paths.stdout,
    stderr_path: paths.stderr,
    stream_path: paths.stream,
    git_diff_path: paths.gitDiff,
    exit_code_path: paths.exitCode,
    feedback_path: paths.feedback,
    questions_path: paths.questions,
    pi_session_dir: paths.piSession,
    stuck_diagnostics_path: paths.stuckDiagnostics,
    likely_stuck: false,
    stuck_diagnostic: null,
  });
  return { root, jobId, paths };
}

function printJobSummary(jobId, paths) {
  console.log(`job_id: ${jobId}`);
  console.log(`job_dir: ${paths.dir}`);
  console.log(`status: ${paths.status}`);
  console.log(`stream_log: ${paths.stream}`);
  console.log(`stdout_log: ${paths.stdout}`);
  console.log(`stderr_log: ${paths.stderr}`);
  console.log(`questions_log: ${paths.questions}`);
  console.log(`feedback_log: ${paths.feedback}`);
  console.log(`pi_session_dir: ${paths.piSession}`);
  console.log(`stuck_diagnostics: ${paths.stuckDiagnostics}`);
  console.log(`result: ${paths.result}`);
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function resolveJob(root, rawJobId) {
  if (!rawJobId) {
    throw new Error("missing job_id");
  }
  const base = runsRoot(root);
  const direct = path.join(base, rawJobId);
  if (fs.existsSync(direct)) return rawJobId;
  if (!fs.existsSync(base)) {
    throw new Error(`no Pi runs found at ${base}`);
  }
  const matches = fs.readdirSync(base).filter((name) => name.startsWith(rawJobId));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`ambiguous job_id ${rawJobId}: ${matches.join(", ")}`);
  }
  throw new Error(`job not found: ${rawJobId}`);
}

function tailLines(file, count) {
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - count - 1)).join("\n");
}

function appendJsonl(file, value) {
  append(file, `${JSON.stringify(value)}\n`);
}

function maybeRecordQuestion(paths, streamName, text) {
  if (streamName !== "stdout" && streamName !== "stderr") return;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const questionLines = lines.filter((line) => {
    return (
      line.endsWith("?") ||
      /\b(confirm|clarify|question|choose|should i|do you want|if you want|please provide|please confirm)\b/i.test(line)
    );
  });
  if (questionLines.length === 0) return;

  const status = readJson(paths.status);
  const questionId = `q-${Date.now().toString(36)}`;
  const event = {
    question_id: questionId,
    job_id: status.job_id,
    at: nowIso(),
    source: streamName,
    text: questionLines.join("\n"),
    reply_command: `node .agent_control/pi_controller.mjs feedback ${status.job_id} "<reply>"`,
  };
  appendJsonl(paths.questions, event);
  if (status.status === "running") {
    updateStatus(paths, {
      phase: "awaiting-feedback",
      last_question_id: questionId,
      last_question_at: event.at,
    });
  }
}

function parseCpuPercent(output) {
  const match = String(output || "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function countEstablishedNetworkConnections(output) {
  return String(output || "").split(/\r?\n/).filter((line) => /\bESTABLISHED\b/i.test(line)).length;
}

function collectProcessDiagnostics(pid, paths, noOutputMs) {
  const checkedAt = nowIso();
  const ps = runCapture("ps", ["-o", "%cpu=", "-p", String(pid)]);
  const lsof = runCapture("lsof", ["-p", String(pid), "-a", "-i"]);
  const cpuPercent = ps.error ? null : parseCpuPercent(ps.stdout);
  const networkConnectionCount = lsof.error ? null : countEstablishedNetworkConnections(lsof.stdout);
  const errors = [];
  if (ps.error) errors.push(`ps: ${ps.error.message}`);
  if (!ps.error && ps.status !== 0) errors.push(`ps exit ${ps.status}: ${(ps.stderr || "").trim()}`);
  if (lsof.error) errors.push(`lsof: ${lsof.error.message}`);
  if (!lsof.error && lsof.status !== 0 && (lsof.stderr || "").trim()) {
    errors.push(`lsof exit ${lsof.status}: ${lsof.stderr.trim()}`);
  }
  const diagnostic = {
    checked_at: checkedAt,
    no_output_ms: noOutputMs,
    cpu_percent: cpuPercent,
    network_connection_count: networkConnectionCount,
    diagnostic_error: errors.length > 0 ? errors.join("; ") : null,
  };

  const lines = [
    `[${checkedAt}] no-output diagnostic for pid ${pid}`,
    `no_output_ms=${noOutputMs}`,
    `cpu_percent=${cpuPercent ?? ""}`,
    `network_connection_count=${networkConnectionCount ?? ""}`,
    diagnostic.diagnostic_error ? `diagnostic_error=${diagnostic.diagnostic_error}` : "diagnostic_error=",
    "",
    "$ ps -o %cpu= -p " + pid,
    ps.stdout || "",
    ps.stderr ? `[stderr]\n${ps.stderr}` : "",
    "",
    "$ lsof -p " + pid + " -a -i",
    lsof.stdout || "",
    lsof.stderr ? `[stderr]\n${lsof.stderr}` : "",
    "",
  ];
  append(paths.stuckDiagnostics, `${lines.join("\n")}\n`);
  return diagnostic;
}

function likelyStuckFromDiagnostic(diagnostic) {
  if (diagnostic.cpu_percent === null || diagnostic.network_connection_count === null) return null;
  return diagnostic.cpu_percent <= 0.1 && diagnostic.network_connection_count === 0;
}

function recordNoOutputDiagnostic(paths, pid, noOutputMs) {
  const diagnostic = collectProcessDiagnostics(pid, paths, noOutputMs);
  const likelyStuck = likelyStuckFromDiagnostic(diagnostic);
  updateStatus(paths, {
    likely_stuck: likelyStuck,
    stuck_diagnostic: diagnostic,
  });
  if (likelyStuck === true) {
    append(paths.stream, `[${diagnostic.checked_at}] controller: likely stuck: ${diagnostic.cpu_percent}% CPU, no established network connections, no output for ${noOutputMs}ms\n`);
  } else if (likelyStuck === false) {
    append(paths.stream, `[${diagnostic.checked_at}] controller: no-output diagnostic shows activity: ${diagnostic.cpu_percent}% CPU, ${diagnostic.network_connection_count} established network connections\n`);
  } else {
    append(paths.stream, `[${diagnostic.checked_at}] controller: no-output diagnostic inconclusive: ${diagnostic.diagnostic_error || "missing CPU or network data"}\n`);
  }
}

function setup() {
  const checks = [];
  const which = runCapture("which", ["pi"], { cwd: repoRoot() });
  checks.push(["which pi", which.status === 0, which.stdout.trim() || which.stderr.trim()]);

  const version = runCapture("pi", ["--version"], { cwd: repoRoot() });
  checks.push(["pi --version", version.status === 0, (version.stdout + version.stderr).trim()]);

  const help = runCapture("pi", ["--help"], { cwd: repoRoot() });
  checks.push(["pi --help", help.status === 0, help.status === 0 ? "available" : (help.stdout + help.stderr).trim()]);

  const models = runCapture("pi", ["--list-models"], { cwd: repoRoot() });
  const modelOutput = `${models.stdout || ""}${models.stderr || ""}`;
  const listModelsExists = models.status === 0 || !/unknown|invalid|unrecognized|no such option/i.test(modelOutput);
  if (models.status === 0) {
    checks.push([`pi --list-models includes ${MODEL}`, modelOutput.includes(MODEL), modelOutput.includes(MODEL) ? "found" : "not found"]);
  } else if (listModelsExists) {
    checks.push(["pi --list-models", false, modelOutput.trim() || `exit ${models.status}`]);
  } else {
    checks.push(["pi --list-models", true, "command not supported; skipped model presence check"]);
  }

  console.log("Pi controller setup check");
  console.log(`repo_root: ${repoRoot()}`);
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? "ok" : "fail"} - ${name}${detail ? `: ${detail}` : ""}`);
  }
  if (checks.some(([, ok]) => !ok)) {
    process.exitCode = 1;
  }
}

function startBackgroundWorker(jobId, paths) {
  const child = spawn(process.execPath, [controllerPath(), "__worker", jobId], {
    cwd: repoRoot(),
    detached: true,
    stdio: "ignore",
  });
  fs.writeFileSync(paths.pid, `${child.pid}\n`, "utf8");
  updateStatus(paths, { pid: child.pid, phase: "worker-started" });
  child.unref();
}

function logOutput(paths, streamName, chunk, foreground) {
  const text = chunk.toString();
  const at = nowIso();
  const target = streamName === "stdout" ? paths.stdout : paths.stderr;
  append(target, text);
  append(paths.stream, text.split(/\r?\n/).filter(Boolean).map((line) => `[${at}] ${streamName}: ${line}`).join("\n") + (text.endsWith("\n") ? "\n" : ""));
  updateStatus(paths, { last_output_at: at, phase: "receiving-output" });
  maybeRecordQuestion(paths, streamName, text);
  if (foreground) {
    const dest = streamName === "stdout" ? process.stdout : process.stderr;
    dest.write(text);
  }
}

function finalizeGitArtifacts(root, paths) {
  writeCommandOutput(paths.gitStatusAfter, "git", ["status", "--short", "--untracked-files=all"], { cwd: root });
  writeCommandOutput(paths.gitDiff, "git", ["diff", "--binary"], { cwd: root });
}

function writeResult(paths, exitCode, signal) {
  const status = exitCode === 0 ? "completed" : "failed";
  const result = [
    `# Pi Job ${status}`,
    "",
    `- Job ID: ${path.basename(paths.dir)}`,
    `- Exit code: ${exitCode ?? ""}`,
    `- Signal: ${signal ?? ""}`,
    `- Stream log: ${paths.stream}`,
    `- Stdout log: ${paths.stdout}`,
    `- Stderr log: ${paths.stderr}`,
    `- Questions log: ${paths.questions}`,
    `- Feedback log: ${paths.feedback}`,
    `- Pi session dir: ${paths.piSession}`,
    `- Stuck diagnostics: ${paths.stuckDiagnostics}`,
    `- Git diff: ${paths.gitDiff}`,
    `- Verify log: ${paths.verify}`,
    "",
    "## Recent Output",
    "",
    "```text",
    tailLines(paths.stream, 80),
    "```",
    "",
  ];
  fs.writeFileSync(paths.result, result.join("\n"), "utf8");
}

function runPiForJob(jobId, { foreground = false } = {}) {
  const root = repoRoot();
  const paths = jobPaths(root, jobId);
  const instruction = fs.readFileSync(paths.instruction, "utf8").trimEnd();
  ensureDir(paths.piSession);
  const args = ["--model", MODEL, "--no-extensions", "--no-skills", "--session-dir", paths.piSession, "-p", instruction];
  updateStatus(paths, { phase: "starting-pi" });

  const pi = spawn("pi", args, {
    cwd: root,
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  fs.writeFileSync(paths.pid, `${pi.pid}\n`, "utf8");
  updateStatus(paths, { pid: pi.pid, phase: "running" });
  append(paths.stream, `[${nowIso()}] controller: started ${commandDisplay(instruction, paths.piSession)}\n`);

  let warned = false;
  let feedbackOffset = 0;
  const warningInterval = setInterval(() => {
    const status = readJson(paths.status);
    if (status.status !== "running") return;
    const last = status.last_output_at ? Date.parse(status.last_output_at) : Date.parse(status.started_at);
    const noOutputMs = Date.now() - last;
    if (!warned && noOutputMs >= NO_OUTPUT_WARNING_MS) {
      warned = true;
      updateStatus(paths, { phase: "no-output-warning" });
      append(paths.stream, `[${nowIso()}] controller: no output for ${NO_OUTPUT_WARNING_MS}ms; process left running\n`);
      recordNoOutputDiagnostic(paths, pi.pid, noOutputMs);
    }
  }, Math.min(60000, NO_OUTPUT_WARNING_MS));

  const feedbackInterval = setInterval(() => {
    if (!fs.existsSync(paths.feedback)) return;
    const stat = fs.statSync(paths.feedback);
    if (stat.size <= feedbackOffset) return;
    const fd = fs.openSync(paths.feedback, "r");
    try {
      const length = stat.size - feedbackOffset;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, feedbackOffset);
      feedbackOffset = stat.size;
      const entries = buffer.toString("utf8").split(/\r?\n/).filter(Boolean);
      for (const entry of entries) {
        const feedback = JSON.parse(entry);
        if (feedback.delivered_at) continue;
        const reply = String(feedback.reply ?? "");
        if (!reply) continue;
        pi.stdin.write(`${reply}\n`);
        append(paths.stream, `[${nowIso()}] controller: feedback sent to pi stdin (${feedback.feedback_id})\n`);
        updateStatus(paths, { phase: "running", last_feedback_id: feedback.feedback_id });
      }
    } catch (error) {
      append(paths.stream, `[${nowIso()}] controller: failed to deliver feedback: ${error.message}\n`);
    } finally {
      fs.closeSync(fd);
    }
  }, FEEDBACK_POLL_MS);

  pi.stdout.on("data", (chunk) => logOutput(paths, "stdout", chunk, foreground));
  pi.stderr.on("data", (chunk) => logOutput(paths, "stderr", chunk, foreground));

  pi.on("error", (error) => {
    clearInterval(warningInterval);
    clearInterval(feedbackInterval);
    append(paths.stderr, `${error.stack || error.message}\n`);
    append(paths.stream, `[${nowIso()}] controller: failed to start pi: ${error.message}\n`);
    fs.writeFileSync(paths.exitCode, "spawn-error\n", "utf8");
    finalizeGitArtifacts(root, paths);
    writeResult(paths, 1, null);
    updateStatus(paths, { status: "failed", phase: "spawn-error" });
    if (foreground) process.exitCode = 1;
  });

  pi.on("close", (exitCode, signal) => {
    clearInterval(warningInterval);
    clearInterval(feedbackInterval);
    const current = readJson(paths.status);
    const finalStatus = current.status === "cancelled" ? "cancelled" : exitCode === 0 ? "completed" : "failed";
    fs.writeFileSync(paths.exitCode, `${exitCode ?? ""}${signal ? ` signal:${signal}` : ""}\n`, "utf8");
    finalizeGitArtifacts(root, paths);
    append(paths.stream, `[${nowIso()}] controller: pi exited with code ${exitCode ?? ""}${signal ? ` signal ${signal}` : ""}\n`);
    writeResult(paths, exitCode, signal);
    updateStatus(paths, { status: finalStatus, phase: finalStatus });
    if (foreground) process.exitCode = exitCode ?? 1;
  });
}

async function runCommand(args) {
  let foreground = args[0] === "--foreground";
  let instructionArgs = foreground ? args.slice(1) : args;
  if (!foreground && args.length === 1 && args[0].startsWith("--foreground ")) {
    foreground = true;
    instructionArgs = [args[0].slice("--foreground ".length)];
  }
  const instruction = instructionArgs.join(" ").trim();
  if (!instruction) {
    throw new Error('usage: pi_controller.mjs run [--foreground] "<task>"');
  }
  const { jobId, paths } = createJob(instruction);
  if (foreground) {
    printJobSummary(jobId, paths);
    await new Promise((resolve) => {
      runPiForJob(jobId, { foreground: true });
      const timer = setInterval(() => {
        const status = readJson(paths.status);
        if (status.status !== "running") {
          clearInterval(timer);
          resolve();
        }
      }, 250);
    });
  } else {
    startBackgroundWorker(jobId, paths);
    printJobSummary(jobId, paths);
    console.log(`follow_logs: node .agent_control/pi_controller.mjs logs --tail ${jobId}`);
    console.log(`result: node .agent_control/pi_controller.mjs result ${jobId}`);
  }
}

function listJobs() {
  const root = repoRoot();
  const base = runsRoot(root);
  if (!fs.existsSync(base)) {
    console.log(`No Pi jobs found for ${root}`);
    return;
  }
  const jobs = fs.readdirSync(base)
    .map((name) => {
      const paths = jobPaths(root, name);
      if (!fs.existsSync(paths.status)) return null;
      const status = readJson(paths.status);
      return { name, paths, status };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.status.updated_at).localeCompare(String(a.status.updated_at)))
    .slice(0, 25);

  if (jobs.length === 0) {
    console.log(`No Pi jobs found for ${root}`);
    return;
  }
  console.log(["job_id", "status", "phase", "likely_stuck", "pid", "last_output_at", "last_question_id", "stream_log"].join("\t"));
  for (const job of jobs) {
    const live = job.status.status === "running" && isPidAlive(job.status.pid) ? "running" : job.status.status;
    console.log([
      job.name,
      live,
      job.status.phase,
      job.status.likely_stuck ?? "",
      job.status.pid || "",
      job.status.last_output_at || "",
      job.status.last_question_id || "",
      job.paths.stream,
    ].join("\t"));
  }
}

function feedback(args) {
  const root = repoRoot();
  const jobId = resolveJob(root, args[0]);
  const reply = args.slice(1).join(" ").trim();
  if (!reply) {
    throw new Error('usage: pi_controller.mjs feedback <job_id> "<reply>"');
  }
  const paths = jobPaths(root, jobId);
  const status = readJson(paths.status);
  const feedbackId = `f-${Date.now().toString(36)}`;
  const event = {
    feedback_id: feedbackId,
    job_id: jobId,
    at: nowIso(),
    reply,
    target_pid: status.pid,
  };
  appendJsonl(paths.feedback, event);
  append(paths.stream, `[${event.at}] controller: feedback queued (${feedbackId})\n`);
  if (status.status === "running") {
    updateStatus(paths, { phase: "feedback-queued", last_feedback_id: feedbackId });
    console.log(`feedback_queued: ${feedbackId}`);
    console.log(`job_id: ${jobId}`);
    console.log(`delivery: live process will receive this on stdin`);
  } else {
    updateStatus(paths, { last_feedback_id: feedbackId });
    console.log(`feedback_recorded: ${feedbackId}`);
    console.log(`job_id: ${jobId}`);
    console.log(`delivery: job is ${status.status}; feedback was recorded but cannot be delivered live`);
    console.log(`continue: node .agent_control/pi_controller.mjs continue ${jobId}`);
  }
  console.log(`feedback_log: ${paths.feedback}`);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function continueCommand(args) {
  const foreground = args[0] === "--foreground";
  const rawJobId = foreground ? args[1] : args[0];
  const root = repoRoot();
  const previousJobId = resolveJob(root, rawJobId);
  const previousPaths = jobPaths(root, previousJobId);
  const originalInstruction = fs.readFileSync(previousPaths.instruction, "utf8").trimEnd();
  const feedbackEntries = readJsonl(previousPaths.feedback);
  const questionEntries = readJsonl(previousPaths.questions);
  const latestFeedback = feedbackEntries.at(-1);
  if (!latestFeedback) {
    throw new Error(`no feedback recorded for ${previousJobId}`);
  }
  const continuationInstruction = [
    `Continue Pi controller job ${previousJobId}.`,
    "",
    "Original instruction:",
    originalInstruction,
    "",
    "Latest recorded question:",
    questionEntries.at(-1)?.text || "(no question was recorded)",
    "",
    "Controller feedback to apply:",
    latestFeedback.reply,
    "",
    "Continue from the prior state using this feedback. Do not choose a new project task.",
    "",
    "Recent prior transcript:",
    tailLines(previousPaths.stream, 80),
  ].join("\n");
  const { jobId, paths } = createJob(continuationInstruction);
  append(paths.stream, `[${nowIso()}] controller: continuation of ${previousJobId} using feedback ${latestFeedback.feedback_id}\n`);
  printJobSummary(jobId, paths);
  if (foreground) {
    await new Promise((resolve) => {
      runPiForJob(jobId, { foreground: true });
      const timer = setInterval(() => {
        const status = readJson(paths.status);
        if (status.status !== "running") {
          clearInterval(timer);
          resolve();
        }
      }, 250);
    });
  } else {
    startBackgroundWorker(jobId, paths);
    console.log(`follow_logs: node .agent_control/pi_controller.mjs logs --tail ${jobId}`);
    console.log(`result: node .agent_control/pi_controller.mjs result ${jobId}`);
  }
}

function questions(args) {
  const root = repoRoot();
  const jobId = resolveJob(root, args[0]);
  const paths = jobPaths(root, jobId);
  const output = tailLines(paths.questions, RECENT_LOG_LINES).trim();
  if (!output) {
    console.log(`No recorded questions for ${jobId}`);
    return;
  }
  console.log(output);
}

function logs(args) {
  const tail = args[0] === "--tail";
  const rawJobId = tail ? args[1] : args[0];
  const root = repoRoot();
  const jobId = resolveJob(root, rawJobId);
  const paths = jobPaths(root, jobId);
  if (tail) {
    const child = spawn("tail", ["-n", String(RECENT_LOG_LINES), "-f", paths.stream], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 0;
    });
    return;
  }
  console.log(tailLines(paths.stream, RECENT_LOG_LINES));
}

function result(args) {
  const root = repoRoot();
  const jobId = resolveJob(root, args[0]);
  const paths = jobPaths(root, jobId);
  if (fs.existsSync(paths.result) && fs.readFileSync(paths.result, "utf8").trim()) {
    console.log(fs.readFileSync(paths.result, "utf8"));
  } else {
    console.log(`No result.md content yet for ${jobId}`);
  }
  const exitCode = fs.existsSync(paths.exitCode) ? fs.readFileSync(paths.exitCode, "utf8").trim() : "";
  console.log(`exit_code: ${exitCode || "(pending)"}`);
  console.log(`git_diff_path: ${paths.gitDiff}`);
  console.log(`verify_log_path: ${paths.verify}`);
}

function cancel(args) {
  const root = repoRoot();
  const jobId = resolveJob(root, args[0]);
  const paths = jobPaths(root, jobId);
  const status = readJson(paths.status);
  const pid = Number(status.pid || (fs.existsSync(paths.pid) ? fs.readFileSync(paths.pid, "utf8").trim() : 0));
  if (pid && isPidAlive(pid)) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      process.kill(pid, "SIGTERM");
    }
  }
  updateStatus(paths, { status: "cancelled", phase: "cancelled" });
  append(paths.stream, `[${nowIso()}] controller: cancelled by controller\n`);
  console.log(`cancelled: ${jobId}`);
}

function verify(args) {
  const root = repoRoot();
  const jobId = resolveJob(root, args[0]);
  const command = args.slice(1).join(" ").trim();
  if (!command) {
    throw new Error('usage: pi_controller.mjs verify <job_id> "<verify command>"');
  }
  const paths = jobPaths(root, jobId);
  const started = nowIso();
  append(paths.verify, `\n[${started}] $ ${command}\n`);
  const child = spawn(command, {
    cwd: root,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    append(paths.verify, chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    append(paths.verify, chunk.toString());
  });
  child.on("close", (code, signal) => {
    append(paths.verify, `\n[${nowIso()}] verify exit_code=${code ?? ""}${signal ? ` signal=${signal}` : ""}\n`);
    console.log(`verify_log_path: ${paths.verify}`);
    process.exitCode = code ?? 1;
  });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === "setup") setup();
    else if (command === "run") await runCommand(args);
    else if (command === "status") listJobs();
    else if (command === "logs") logs(args);
    else if (command === "questions") questions(args);
    else if (command === "feedback") feedback(args);
    else if (command === "continue") await continueCommand(args);
    else if (command === "result") result(args);
    else if (command === "cancel") cancel(args);
    else if (command === "verify") verify(args);
    else if (command === "__worker") runPiForJob(args[0], { foreground: false });
    else {
      console.error(`unknown command: ${command || "(none)"}`);
      console.error("usage: pi_controller.mjs setup|run|status|logs|questions|feedback|continue|result|cancel|verify");
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

main();
