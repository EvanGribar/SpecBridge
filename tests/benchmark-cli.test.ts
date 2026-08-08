import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const root = process.cwd();

describe("specbridge bench CLI", () => {
  it("validates and lists consolidated cases", async () => {
    const validated = await run("node", ["packages/cli/dist/index.js", "bench", "validate", "--benchmark", "v0.2"], { cwd: root });
    expect(validated.stdout).toContain("Validated 10 cases");
    const listed = await run("node", ["packages/cli/dist/index.js", "bench", "list", "--benchmark", "v0.2"], { cwd: root });
    expect(listed.stdout).toContain("admin-invite-authorization");
  });

  it("runs offline fixture and dry-run reviewers without provider calls", async () => {
    const directory = mkdtempSync(join(tmpdir(), "specbridge-cli-"));
    try {
      const fixturePath = join(directory, "fixture.json");
      await run("node", ["packages/cli/dist/index.js", "bench", "review", "--reviewer", "json-file", "--fixture", "perfect", "--max-cases", "1", "--output", fixturePath], { cwd: root });
      const fixtureRun = JSON.parse(readFileSync(fixturePath, "utf8"));
      expect(fixtureRun.cases).toHaveLength(1);
      expect(fixtureRun.cases[0].output.findings.length).toBeGreaterThan(0);

      const dryRunPath = join(directory, "dry-run.json");
      await run("node", ["packages/cli/dist/index.js", "bench", "review", "--reviewer", "single-agent", "--dry-run", "--max-cases", "1", "--output", dryRunPath], { cwd: root });
      const dryRun = JSON.parse(readFileSync(dryRunPath, "utf8"));
      expect(dryRun.cases[0].output.metadata.dryRun).toBe(true);
      expect(dryRun.cases[0].output.findings).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
