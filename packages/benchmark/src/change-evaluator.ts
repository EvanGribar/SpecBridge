import { execSync } from "node:child_process";
import {
  type ChangeTask,
  type ChangeRunResult,
  type ChangeRequirementResult,
  resolveChangeFixture,
  validateChangeTask,
  readChangeTask
} from "./index.js";
import { type DiffSummary, ChangeWorkspace } from "./change-workspace.js";
import { type ChangeAgentAdapter, MockAgentAdapter } from "./change-agent-adapter.js";

export interface ChangeEvaluatorOptions {
  taskFilePath: string;
  agent?: ChangeAgentAdapter;
}

export function redactSecrets(text: string): string {
  if (!text) return text;
  // Redact common patterns like API keys or sensitive env variable values if present
  let sanitized = text;
  const envKeysToRedact = ["OPENAI_API_KEY", "AWS_SECRET_ACCESS_KEY", "GITHUB_TOKEN", "SECRET_KEY"];
  for (const key of envKeysToRedact) {
    const val = process.env[key];
    if (val && val.length > 5) {
      sanitized = sanitized.replaceAll(val, "[REDACTED_SECRET]");
    }
  }
  return sanitized;
}

export async function runChangeEvaluation(options: ChangeEvaluatorOptions): Promise<ChangeRunResult> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const validationResult = validateChangeTask(options.taskFilePath);
  if (!validationResult.valid || !validationResult.task) {
    throw new Error(`Task validation failed: ${validationResult.errors.join("; ")}`);
  }

  const task: ChangeTask = validationResult.task;
  const fixtureDir = resolveChangeFixture(options.taskFilePath, task.repository.fixture);

  const agent = options.agent || new MockAgentAdapter();
  const workspace = new ChangeWorkspace(fixtureDir);

  let processResult: "passed" | "failed" | "timeout" | "error" = "passed";
  let failureReason: string | null = null;
  let agentExecution: any = null;
  let diffSummary: DiffSummary = { filesChanged: 0, insertions: 0, deletions: 0, diff: "", changedFiles: [] };
  const validationCommandResults: Array<{ command: string; exitCode: number; stdout: string; stderr: string; passed: boolean; runtimeMs: number }> = [];
  const requirementResults: ChangeRequirementResult[] = [];
  let cleanedUp = false;

  try {
    const timeoutMs = (task.budgets?.timeout_seconds || 120) * 1000;
    const maxOutputBytes = task.budgets?.max_output_bytes || 1000000;

    // 1. Run Agent inside isolated workspace
    agentExecution = await agent.execute({
      workingDirectory: workspace.tempDir,
      prompt: task.task.prompt,
      timeoutMs,
      maxOutputBytes
    });

    if (agentExecution.exitCode === -1) {
      processResult = "timeout";
      failureReason = "Agent execution timed out";
    } else if (agentExecution.exitCode !== 0) {
      processResult = "failed";
      failureReason = `Agent process exited with non-zero code ${agentExecution.exitCode}`;
    }

    // 2. Capture Git diff resulting from agent work
    diffSummary = workspace.getDiffSummary();

    // 3. Run overall task validation commands
    for (const cmd of task.validation.commands) {
      const cmdStartTime = Date.now();
      let exitCode = 0;
      let stdout = "";
      let stderr = "";

      try {
        stdout = execSync(cmd, { cwd: workspace.tempDir, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] });
      } catch (err: any) {
        exitCode = err.status !== undefined ? err.status : 1;
        stdout = err.stdout ? String(err.stdout) : "";
        stderr = err.stderr ? String(err.stderr) : (err.message || String(err));
      }

      const runtimeMs = Date.now() - cmdStartTime;
      validationCommandResults.push({
        command: cmd,
        exitCode,
        stdout: redactSecrets(stdout.slice(0, maxOutputBytes)),
        stderr: redactSecrets(stderr.slice(0, maxOutputBytes)),
        passed: exitCode === 0,
        runtimeMs
      });
    }

    // 4. Run deterministic requirement checks
    for (const req of task.requirements) {
      const reqCheckResults: Array<{ type: string; command: string; exitCode: number; passed: boolean; stdout: string; stderr: string; runtimeMs: number }> = [];

      if (processResult === "timeout") {
        // Requirements are not verifiable if agent timed out before checks could run
        requirementResults.push({
          id: req.id,
          description: req.description,
          severity: req.severity,
          status: "not_verifiable",
          checks: []
        });
        continue;
      }

      let allPassed = true;
      let isVerifiable = true;

      for (const chk of req.checks) {
        const chkStartTime = Date.now();
        let exitCode = 0;
        let stdout = "";
        let stderr = "";

        try {
          stdout = execSync(chk.command, { cwd: workspace.tempDir, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] });
        } catch (err: any) {
          exitCode = err.status !== undefined ? err.status : 1;
          stdout = err.stdout ? String(err.stdout) : "";
          stderr = err.stderr ? String(err.stderr) : (err.message || String(err));
        }

        const runtimeMs = Date.now() - chkStartTime;
        const passed = exitCode === 0;
        if (!passed) {
          allPassed = false;
        }

        reqCheckResults.push({
          type: chk.type,
          command: chk.command,
          exitCode,
          passed,
          stdout: redactSecrets(stdout.slice(0, maxOutputBytes)),
          stderr: redactSecrets(stderr.slice(0, maxOutputBytes)),
          runtimeMs
        });
      }

      const status = !isVerifiable ? "not_verifiable" : (allPassed ? "satisfied" : "violated");
      requirementResults.push({
        id: req.id,
        description: req.description,
        severity: req.severity,
        status,
        checks: reqCheckResults
      });
    }
  } catch (err: any) {
    processResult = "error";
    failureReason = err.message || String(err);
  } finally {
    // 5. Cleanup temporary workspace directory
    cleanedUp = workspace.cleanup();
  }

  const completedAt = new Date().toISOString();
  const totalRuntimeMs = Date.now() - startTime;

  const satisfiedCount = requirementResults.filter(r => r.status === "satisfied").length;
  const violatedCount = requirementResults.filter(r => r.status === "violated").length;
  const notVerifiableCount = requirementResults.filter(r => r.status === "not_verifiable").length;
  const passedCommands = validationCommandResults.filter(v => v.passed).length;

  return {
    schemaVersion: "1",
    taskId: task.id,
    mode: "change",
    agentId: agent.agentId,
    startedAt,
    completedAt,
    processResult,
    agent: {
      agentId: agent.agentId,
      executable: agentExecution?.executable || "mock",
      args: agentExecution?.args || [],
      inputMechanism: agentExecution?.inputMechanism || "mock",
      workingDirectory: agentExecution?.workingDirectory || workspace.tempDir,
      allowedEnv: agentExecution?.allowedEnv || [],
      timeoutMs: agentExecution?.timeoutMs || 120000,
      exitCode: agentExecution?.exitCode ?? -1,
      stdout: redactSecrets(agentExecution?.stdout || ""),
      stderr: redactSecrets(agentExecution?.stderr || ""),
      runtimeMs: agentExecution?.runtimeMs || 0,
      tokens: agentExecution?.tokens,
      costUsd: agentExecution?.costUsd
    },
    patch: {
      filesChanged: diffSummary.filesChanged,
      insertions: diffSummary.insertions,
      deletions: diffSummary.deletions,
      diff: diffSummary.diff,
      changedFiles: diffSummary.changedFiles
    },
    validation: {
      totalCommands: validationCommandResults.length,
      passedCommands,
      results: validationCommandResults
    },
    requirements: requirementResults,
    summary: {
      satisfiedCount,
      violatedCount,
      notVerifiableCount
    },
    runtimeMs: totalRuntimeMs,
    cleanup: {
      cleanedUp,
      tempDir: workspace.tempDir
    },
    failureReason
  };
}
