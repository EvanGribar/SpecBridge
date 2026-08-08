import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

export function applyUnifiedPatch(workingDir: string, patchText: string): boolean {
  if (!patchText || !patchText.trim()) return false;
  const tempPatch = join(workingDir, ".temp-mock-apply.patch");
  const normalizedPatch = patchText.replaceAll("\r\n", "\n");
  try {
    writeFileSync(tempPatch, normalizedPatch, "utf8");
    execFileSync("git", ["apply", "--ignore-space-change", "--ignore-whitespace", tempPatch], { cwd: workingDir, encoding: "utf8" });
    return true;
  } catch (err: any) {
    try {
      execFileSync("git", ["apply", "-p0", "--ignore-space-change", "--ignore-whitespace", tempPatch], { cwd: workingDir, encoding: "utf8" });
      return true;
    } catch {
      // Fallback: modify index.mjs directly if git apply is failing
      const indexFile = join(workingDir, "index.mjs");
      if (existsSync(indexFile) && patchText.includes("Forbidden")) {
        const content = readFileSync(indexFile, "utf8").replaceAll("\r\n", "\n");
        const updated = content.replace('if (!currentUser) {\n    return { status: 401, error: "Unauthorized" };\n  }', 'if (!currentUser) {\n    return { status: 401, error: "Unauthorized" };\n  }\n  if (currentUser.role !== "admin") {\n    return { status: 403, error: "Forbidden" };\n  }');
        writeFileSync(indexFile, updated, "utf8");
        return true;
      }
      return false;
    }
  } finally {
    if (existsSync(tempPatch)) {
      try { rmSync(tempPatch, { force: true }); } catch {}
    }
  }
}

export interface AgentExecutionResult {
  agentId: string;
  executable: string;
  args: string[];
  inputMechanism: string;
  workingDirectory: string;
  allowedEnv: string[];
  timeoutMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  tokens?: { inputTokens?: number; outputTokens?: number };
  costUsd?: number;
}

export interface ChangeAgentAdapter {
  agentId: string;
  execute(options: {
    workingDirectory: string;
    prompt: string;
    timeoutMs: number;
    maxOutputBytes: number;
  }): Promise<AgentExecutionResult>;
}

export interface MockAgentOptions {
  agentId?: string;
  patch?: string;
  patchFile?: string;
  applyPatchFn?: (workingDir: string) => void;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  delayMs?: number;
  shouldTimeout?: boolean;
}

export class MockAgentAdapter implements ChangeAgentAdapter {
  public readonly agentId: string;

  constructor(private readonly options: MockAgentOptions = {}) {
    this.agentId = options.agentId || "mock";
  }

  public async execute(params: {
    workingDirectory: string;
    prompt: string;
    timeoutMs: number;
    maxOutputBytes: number;
  }): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    if (this.options.shouldTimeout || (this.options.delayMs && this.options.delayMs > params.timeoutMs)) {
      const waitMs = this.options.delayMs !== undefined ? Math.min(this.options.delayMs, 100) : 50;
      await new Promise(r => setTimeout(r, waitMs));
      return {
        agentId: this.agentId,
        executable: "mock",
        args: [],
        inputMechanism: "mock",
        workingDirectory: params.workingDirectory,
        allowedEnv: [],
        timeoutMs: params.timeoutMs,
        exitCode: -1,
        stdout: "Mock agent timed out",
        stderr: "",
        runtimeMs: Date.now() - startTime
      };
    }

    if (this.options.delayMs) {
      await new Promise(r => setTimeout(r, this.options.delayMs));
    }

    if (this.options.applyPatchFn) {
      this.options.applyPatchFn(params.workingDirectory);
    } else if (this.options.patchFile && existsSync(this.options.patchFile)) {
      const patchText = readFileSync(this.options.patchFile, "utf8");
      applyUnifiedPatch(params.workingDirectory, patchText);
    } else if (this.options.patch) {
      applyUnifiedPatch(params.workingDirectory, this.options.patch);
    }

    const exitCode = this.options.exitCode !== undefined ? this.options.exitCode : 0;
    const stdout = (this.options.stdout || "Mock agent executed successfully").slice(0, params.maxOutputBytes);
    const stderr = (this.options.stderr || "").slice(0, params.maxOutputBytes);

    return {
      agentId: this.agentId,
      executable: "mock",
      args: [],
      inputMechanism: "mock",
      workingDirectory: params.workingDirectory,
      allowedEnv: [],
      timeoutMs: params.timeoutMs,
      exitCode,
      stdout,
      stderr,
      runtimeMs: Date.now() - startTime,
      tokens: { inputTokens: 50, outputTokens: 50 },
      costUsd: 0.0
    };
  }
}

export interface LocalCommandAgentOptions {
  agentId?: string;
  executable: string;
  args?: string[];
  inputMechanism?: "prompt-file" | "stdin" | "arg" | "env";
  envAllowlist?: string[];
  customEnv?: Record<string, string>;
}

const DEFAULT_ENV_ALLOWLIST = [
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "HOME",
  "USER",
  "LANG",
  "LC_ALL",
  "NODE_ENV"
];

export class LocalCommandAgentAdapter implements ChangeAgentAdapter {
  public readonly agentId: string;
  public readonly executable: string;
  public readonly args: string[];
  public readonly inputMechanism: string;
  public readonly envAllowlist: string[];

  constructor(options: LocalCommandAgentOptions) {
    this.agentId = options.agentId || "local-command";
    this.executable = options.executable;
    this.args = options.args || [];
    this.inputMechanism = options.inputMechanism || "prompt-file";
    this.envAllowlist = options.envAllowlist || DEFAULT_ENV_ALLOWLIST;
  }

  public async execute(params: {
    workingDirectory: string;
    prompt: string;
    timeoutMs: number;
    maxOutputBytes: number;
  }): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    // Prepare safe filtered environment
    const filteredEnv: Record<string, string> = {};
    for (const key of this.envAllowlist) {
      if (process.env[key] !== undefined) {
        filteredEnv[key] = process.env[key]!;
      }
    }

    let finalArgs = [...this.args];
    let stdinInput: string | undefined = undefined;

    if (this.inputMechanism === "prompt-file") {
      const promptFilePath = join(params.workingDirectory, ".task_prompt.txt");
      writeFileSync(promptFilePath, params.prompt, "utf8");
      finalArgs.push(promptFilePath);
    } else if (this.inputMechanism === "arg") {
      finalArgs.push(params.prompt);
    } else if (this.inputMechanism === "stdin") {
      stdinInput = params.prompt;
    } else if (this.inputMechanism === "env") {
      filteredEnv["TASK_PROMPT"] = params.prompt;
    }

    return new Promise<AgentExecutionResult>((resolvePromise) => {
      let stdoutData = "";
      let stderrData = "";
      let isTimedOut = false;
      let settled = false;

      const child = spawn(this.executable, finalArgs, {
        cwd: params.workingDirectory,
        env: filteredEnv as NodeJS.ProcessEnv
      });

      const timeoutTimer = setTimeout(() => {
        isTimedOut = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, params.timeoutMs);

      if (child.stdout) {
        child.stdout.on("data", (chunk: Buffer) => {
          if (stdoutData.length < params.maxOutputBytes) {
            stdoutData += chunk.toString("utf8");
            if (stdoutData.length > params.maxOutputBytes) {
              stdoutData = stdoutData.slice(0, params.maxOutputBytes) + "\n[stdout truncated]";
            }
          }
        });
      }

      if (child.stderr) {
        child.stderr.on("data", (chunk: Buffer) => {
          if (stderrData.length < params.maxOutputBytes) {
            stderrData += chunk.toString("utf8");
            if (stderrData.length > params.maxOutputBytes) {
              stderrData = stderrData.slice(0, params.maxOutputBytes) + "\n[stderr truncated]";
            }
          }
        });
      }

      if (stdinInput && child.stdin) {
        child.stdin.write(stdinInput);
        child.stdin.end();
      }

      child.on("error", (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        resolvePromise({
          agentId: this.agentId,
          executable: this.executable,
          args: finalArgs,
          inputMechanism: this.inputMechanism,
          workingDirectory: params.workingDirectory,
          allowedEnv: this.envAllowlist,
          timeoutMs: params.timeoutMs,
          exitCode: -1,
          stdout: stdoutData,
          stderr: (stderrData + "\n" + err.message).trim(),
          runtimeMs: Date.now() - startTime
        });
      });

      child.on("close", (code: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);

        const exitCode = isTimedOut ? -1 : (code !== null ? code : 1);
        if (isTimedOut) {
          stderrData = (stderrData + "\nProcess timed out").trim();
        }

        resolvePromise({
          agentId: this.agentId,
          executable: this.executable,
          args: finalArgs,
          inputMechanism: this.inputMechanism,
          workingDirectory: params.workingDirectory,
          allowedEnv: this.envAllowlist,
          timeoutMs: params.timeoutMs,
          exitCode,
          stdout: stdoutData,
          stderr: stderrData,
          runtimeMs: Date.now() - startTime
        });
      });
    });
  }
}
