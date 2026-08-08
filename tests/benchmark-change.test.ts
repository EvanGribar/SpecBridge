import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  validateChangeTask,
  readChangeTask,
  ChangeTaskSchema
} from "@specbridge/benchmark";
import {
  runChangeEvaluation,
  MockAgentAdapter,
  LocalCommandAgentAdapter,
  ChangeWorkspace,
  redactSecrets
} from "@specbridge/benchmark";

const rootDir = resolve(process.cwd());
const authTaskPath = join(rootDir, "tasks", "change", "authorization.yml");
const stateTaskPath = join(rootDir, "tasks", "change", "state-invariant.yml");
const uxTaskPath = join(rootDir, "tasks", "change", "user-visible-behavior.yml");

describe("Change Mode Coding-Agent Evaluation", () => {
  it("1. Task schema validation - validates all 3 valid task definitions", () => {
    for (const taskPath of [authTaskPath, stateTaskPath, uxTaskPath]) {
      const res = validateChangeTask(taskPath);
      expect(res.valid, `Expected ${taskPath} to be valid: ${res.errors?.join("; ")}`).toBe(true);
      expect(res.task?.mode).toBe("change");
      expect(res.task?.version).toBe(1);
    }
  });

  it("2. Unknown schema version rejection", () => {
    const invalidTask = {
      version: 99,
      id: "invalid-version",
      mode: "change",
      repository: { fixture: "fixtures/change/authorization/repository" },
      task: { prompt: "Test" },
      requirements: [{ id: "R1", description: "R1", checks: [{ type: "command", command: "node test.mjs" }] }]
    };
    const parseRes = ChangeTaskSchema.safeParse(invalidTask);
    expect(parseRes.success).toBe(false);
  });

  it("3. Path traversal rejection", () => {
    const tempFile = join(tmpdir(), `test-traversal-${Date.now()}.yml`);
    const yamlContent = `
version: 1
id: test-traversal
mode: change
repository:
  fixture: ../../../../../etc
task:
  prompt: test
requirements:
  - id: R1
    description: test
    checks:
      - type: test
        command: node test.mjs
`;
    writeFileSync(tempFile, yamlContent, "utf8");
    const res = validateChangeTask(tempFile);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes("path traversal") || e.includes("does not exist"))).toBe(true);
  });

  it("4. Absolute path rejection", () => {
    const tempFile = join(tmpdir(), `test-abs-${Date.now()}.yml`);
    const yamlContent = `
version: 1
id: test-abs
mode: change
repository:
  fixture: ${process.platform === "win32" ? "C:\\\\Windows\\\\System32" : "/usr/bin"}
task:
  prompt: test
requirements:
  - id: R1
    description: test
    checks:
      - type: test
        command: node test.mjs
`;
    writeFileSync(tempFile, yamlContent, "utf8");
    const res = validateChangeTask(tempFile);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes("Absolute fixture paths are not allowed"))).toBe(true);
  });

  it("5. Temporary workspace creation", () => {
    const fixtureDir = join(rootDir, "fixtures", "change", "authorization", "repository");
    const workspace = new ChangeWorkspace(fixtureDir);
    expect(existsSync(workspace.tempDir)).toBe(true);
    expect(workspace.tempDir.includes("specbridge-change-")).toBe(true);
    workspace.cleanup();
    expect(existsSync(workspace.tempDir)).toBe(false);
  });

  it("6. Source fixture immutability", async () => {
    const fixtureDir = join(rootDir, "fixtures", "change", "authorization", "repository");
    const filesBefore = readdirSync(fixtureDir).map(f => ({
      name: f,
      content: readFileSync(join(fixtureDir, f), "utf8"),
      size: statSync(join(fixtureDir, f)).size
    }));

    await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({
        patchFile: join(rootDir, "fixtures", "change", "authorization", "passing.patch")
      })
    });

    const filesAfter = readdirSync(fixtureDir).map(f => ({
      name: f,
      content: readFileSync(join(fixtureDir, f), "utf8"),
      size: statSync(join(fixtureDir, f)).size
    }));

    expect(filesAfter).toEqual(filesBefore);
  });

  it("7. Successful mock-agent patch and git diff capture", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({
        patchFile: join(rootDir, "fixtures", "change", "authorization", "passing.patch")
      })
    });

    expect(result.processResult).toBe("passed");
    expect(result.patch.filesChanged).toBeGreaterThanOrEqual(1);
    expect(result.patch.diff).toContain("Forbidden");
    expect(result.summary.satisfiedCount).toBe(2);
  });

  it("8. Agent timeout handling", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({
        shouldTimeout: true
      })
    });

    expect(result.processResult).toBe("timeout");
    expect(result.agent.exitCode).toBe(-1);
    expect(result.requirements.every(r => r.status === "not_verifiable")).toBe(true);
    expect(result.summary.notVerifiableCount).toBeGreaterThan(0);
  });

  it("9. Agent nonzero exit handling", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({
        exitCode: 42,
        stderr: "Agent error occurred"
      })
    });

    expect(result.processResult).toBe("failed");
    expect(result.agent.exitCode).toBe(42);
    expect(result.failureReason).toContain("42");
  });

  it("10. No patch produced (clean repository)", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({
        stdout: "No changes needed"
      })
    });

    expect(result.processResult).toBe("passed");
    expect(result.patch.filesChanged).toBe(0);
    expect(result.patch.diff).toBe("");
  });

  it("11. Validation success", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({
        patchFile: join(rootDir, "fixtures", "change", "authorization", "passing.patch")
      })
    });

    expect(result.validation.passedCommands).toBe(result.validation.totalCommands);
    expect(result.validation.results.every(v => v.passed)).toBe(true);
  });

  it("12. Validation failure", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({
        patchFile: join(rootDir, "fixtures", "change", "authorization", "incomplete.patch")
      })
    });

    expect(result.validation.passedCommands).toBe(0);
    expect(result.validation.results.some(v => !v.passed)).toBe(true);
  });

  it("13. Requirement status mapping (satisfied, violated, not_verifiable)", async () => {
    const satisfiedRun = await runChangeEvaluation({
      taskFilePath: stateTaskPath,
      agent: new MockAgentAdapter({
        patchFile: join(rootDir, "fixtures", "change", "state-invariant", "passing.patch")
      })
    });

    expect(satisfiedRun.summary.satisfiedCount).toBe(2);
    expect(satisfiedRun.summary.violatedCount).toBe(0);

    const violatedRun = await runChangeEvaluation({
      taskFilePath: stateTaskPath,
      agent: new MockAgentAdapter({
        patchFile: join(rootDir, "fixtures", "change", "state-invariant", "incomplete.patch")
      })
    });

    expect(violatedRun.summary.violatedCount).toBeGreaterThan(0);

    const timeoutRun = await runChangeEvaluation({
      taskFilePath: stateTaskPath,
      agent: new MockAgentAdapter({
        shouldTimeout: true
      })
    });

    expect(timeoutRun.summary.notVerifiableCount).toBe(2);
  });

  it("14. Environment allowlisting", async () => {
    const previousSecret = process.env.SECRET_TEST_KEY;
    process.env.SECRET_TEST_KEY = "super_secret_value_123";

    try {
      const adapter = new LocalCommandAgentAdapter({
        executable: process.platform === "win32" ? "cmd.exe" : "sh",
        args: process.platform === "win32" ? ["/c", "echo %SECRET_TEST_KEY% %PATH%"] : ["-c", "echo $SECRET_TEST_KEY $PATH"],
        envAllowlist: ["PATH"]
      });

      const result = await runChangeEvaluation({
        taskFilePath: authTaskPath,
        agent: adapter
      });

      expect(result.agent.allowedEnv).toEqual(["PATH"]);
      expect(result.agent.stdout).not.toContain("super_secret_value_123");
    } finally {
      if (previousSecret !== undefined) process.env.SECRET_TEST_KEY = previousSecret;
      else delete process.env.SECRET_TEST_KEY;
    }
  });

  it("15. Secret redaction", () => {
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-proj-secret-key-123456789";

    try {
      const textWithSecret = "Error connecting with key sk-proj-secret-key-123456789";
      const sanitized = redactSecrets(textWithSecret);
      expect(sanitized).not.toContain("sk-proj-secret-key-123456789");
      expect(sanitized).toContain("[REDACTED_SECRET]");
    } finally {
      if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it("16. Output-size truncation", async () => {
    const adapter = new MockAgentAdapter({
      stdout: "A".repeat(200)
    });

    const result = await adapter.execute({
      workingDirectory: rootDir,
      prompt: "test",
      timeoutMs: 1000,
      maxOutputBytes: 50
    });

    expect(result.stdout.length).toBeLessThanOrEqual(50);
  });

  it("17. Cleanup after success", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: uxTaskPath,
      agent: new MockAgentAdapter({
        patchFile: join(rootDir, "fixtures", "change", "user-visible-behavior", "passing.patch")
      })
    });

    expect(result.cleanup.cleanedUp).toBe(true);
    expect(existsSync(result.cleanup.tempDir)).toBe(false);
  });

  it("18. Cleanup after failure", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: uxTaskPath,
      agent: new MockAgentAdapter({
        exitCode: 1,
        stderr: "Execution error"
      })
    });

    expect(result.cleanup.cleanedUp).toBe(true);
    expect(existsSync(result.cleanup.tempDir)).toBe(false);
  });

  it("19. Deterministic JSON ordering", async () => {
    const result1 = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({ patchFile: join(rootDir, "fixtures", "change", "authorization", "passing.patch") })
    });
    const result2 = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({ patchFile: join(rootDir, "fixtures", "change", "authorization", "passing.patch") })
    });

    const keys1 = Object.keys(result1);
    const keys2 = Object.keys(result2);
    expect(keys1).toEqual(keys2);
  });

  it("20. Windows and POSIX path handling", async () => {
    const result = await runChangeEvaluation({
      taskFilePath: authTaskPath,
      agent: new MockAgentAdapter({ patchFile: join(rootDir, "fixtures", "change", "authorization", "passing.patch") })
    });

    expect(result.patch.diff).not.toContain("\r\n");
  });
});
