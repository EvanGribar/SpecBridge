import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "@specbridge/repository";
import { runAudit } from "@specbridge/rules";
import { auditReportToSarif } from "@specbridge/sarif";

const fixturePath = (name: string) => resolve(import.meta.dirname, "fixtures", name);

describe("SpecBridge Audit Rules & Fixtures", () => {
  it("scenario 1: clean-repo passes with score 100 and 0 errors", async () => {
    const inv = await scanRepository(fixturePath("clean-repo"));
    const report = runAudit(inv);
    expect(report.summary.errors).toBe(0);
    expect(report.score?.value).toBe(100);
  });

  it("scenario 2: npm-says-pnpm flags package-manager-conflict", async () => {
    const inv = await scanRepository(fixturePath("npm-says-pnpm"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "package-manager-conflict")).toBe(true);
    expect(report.summary.errors).toBeGreaterThan(0);
  });

  it("scenario 3: pnpm-monorepo-says-npm flags package-manager-conflict", async () => {
    const inv = await scanRepository(fixturePath("pnpm-monorepo-says-npm"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "package-manager-conflict")).toBe(true);
  });

  it("scenario 4: deleted-dir-ref flags missing-path", async () => {
    const inv = await scanRepository(fixturePath("deleted-dir-ref"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "missing-path" && f.description.includes("apps/api"))).toBe(true);
  });

  it("scenario 5: contradictory-agents-md flags command-conflict or contradictory-guidance", async () => {
    const inv = await scanRepository(fixturePath("contradictory-agents-md"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "contradictory-guidance" || f.ruleId === "command-conflict")).toBe(true);
  });

  it("scenario 6: empty-copilot-glob flags empty-scope", async () => {
    const inv = await scanRepository(fixturePath("empty-copilot-glob"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "empty-scope")).toBe(true);
  });

  it("scenario 7: node-version-conflict flags runtime-conflict", async () => {
    const inv = await scanRepository(fixturePath("node-version-conflict"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "runtime-conflict")).toBe(true);
  });

  it("scenario 8: ci-command-mismatch flags ci-command-mismatch", async () => {
    const inv = await scanRepository(fixturePath("ci-command-mismatch"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "ci-command-mismatch")).toBe(true);
  });

  it("scenario 9: duplicate-guidance flags duplicate-guidance", async () => {
    const inv = await scanRepository(fixturePath("duplicate-guidance"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "duplicate-guidance")).toBe(true);
  });

  it("scenario 10: malicious-oversized-input flags invalid-path-escape and malformed-metadata", async () => {
    const inv = await scanRepository(fixturePath("malicious-oversized-input"));
    const report = runAudit(inv);
    expect(report.findings.some((f) => f.ruleId === "invalid-path-escape")).toBe(true);
    expect(report.findings.some((f) => f.ruleId === "malformed-metadata")).toBe(true);
  });

  it("generates valid SARIF 2.1.0 log from audit report", async () => {
    const inv = await scanRepository(fixturePath("deleted-dir-ref"));
    const report = runAudit(inv);
    const sarif = auditReportToSarif(report);

    expect(sarif.version).toBe("2.1.0");
    const firstRun = sarif.runs[0] as { tool: { driver: { name: string } }; results: unknown[] };
    expect(firstRun.tool.driver.name).toBe("SpecBridge");
    expect(firstRun.results.length).toBeGreaterThan(0);
  });
});
