import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface DiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  diff: string;
  changedFiles: string[];
}

export class ChangeWorkspace {
  public readonly tempDir: string;
  private isCleanedUp = false;

  constructor(public readonly fixtureDir: string) {
    if (!existsSync(fixtureDir)) {
      throw new Error(`Fixture directory not found: ${fixtureDir}`);
    }
    this.tempDir = mkdtempSync(join(tmpdir(), "specbridge-change-"));
    this.setupWorkspace();
  }

  private setupWorkspace(): void {
    cpSync(this.fixtureDir, this.tempDir, { recursive: true });

    execFileSync("git", ["init"], { cwd: this.tempDir, stdio: "ignore" });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: this.tempDir, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "SpecBridge Evaluator"], { cwd: this.tempDir, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "evaluator@specbridge.local"], { cwd: this.tempDir, stdio: "ignore" });
    execFileSync("git", ["add", "-A"], { cwd: this.tempDir, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "baseline", "--allow-empty"], { cwd: this.tempDir, stdio: "ignore" });
  }

  public getDiffSummary(): DiffSummary {
    try {
      execFileSync("git", ["add", "-N", "."], { cwd: this.tempDir, stdio: "ignore" });
      const rawDiff = execFileSync("git", ["diff", "HEAD"], { cwd: this.tempDir, encoding: "utf8" }).replaceAll("\r\n", "\n");
      const changedFilesStr = execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: this.tempDir, encoding: "utf8" });
      const changedFiles = changedFilesStr.split("\n").map(s => s.trim()).filter(Boolean);

      const statOutput = execFileSync("git", ["diff", "--stat", "HEAD"], { cwd: this.tempDir, encoding: "utf8" });

      let filesChanged = 0;
      let insertions = 0;
      let deletions = 0;

      const statMatch = statOutput.match(/(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/);
      if (statMatch) {
        filesChanged = parseInt(statMatch[1] ?? "0", 10) || 0;
        insertions = parseInt(statMatch[2] || "0", 10) || 0;
        deletions = parseInt(statMatch[3] || "0", 10) || 0;
      }

      return {
        filesChanged,
        insertions,
        deletions,
        diff: rawDiff,
        changedFiles
      };
    } catch {
      return {
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        diff: "",
        changedFiles: []
      };
    }
  }

  public cleanup(): boolean {
    if (!this.isCleanedUp) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true });
        this.isCleanedUp = true;
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }
}
