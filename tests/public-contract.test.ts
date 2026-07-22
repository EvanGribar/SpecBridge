import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { JsonAdapter, MarkdownAdapter, OpenSpecAdapter } from "@specbridge/adapters";
import { parseContract, parseCoverageReport, validateCoverageAgainstContract } from "@specbridge/core";
import { toSarif } from "@specbridge/sarif";

const exec = promisify(execFile);
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));

describe("public contracts", () => {
  it("accepts a multi-requirement contract and rejects unknown schema versions", async () => {
    const contract = await json("conformance/valid/minimal-contract.json");
    contract.requirements.push({ ...contract.requirements[0], id: "second", criteria: [{ id: "second-criterion", description: "another criterion" }] });
    expect(parseContract(contract).requirements).toHaveLength(2);
    contract.schemaVersion = "2.0";
    expect(() => parseContract(contract)).toThrow("Invalid requirement contract");
  });

  it("enforces coverage confidence bounds and contract-level completeness", async () => {
    const contract = parseContract(await json("conformance/valid/minimal-contract.json"));
    const expandedContract = parseContract({ ...contract, requirements: [{ ...contract.requirements[0]!, criteria: [...contract.requirements[0]!.criteria, { id: "missing", description: "must be present" }] }] });
    const report = parseCoverageReport(await json("conformance/valid/coverage.json"));
    expect(() => validateCoverageAgainstContract(expandedContract, report)).toThrow("does not conform");
    const matching = parseCoverageReport({ ...report, contractId: contract.id, requirements: [{ requirementId: contract.requirements[0]!.id, criteria: contract.requirements[0]!.criteria.map((criterion) => ({ criterionId: criterion.id, status: "satisfied", explanation: "covered", evidence: [] })) }] });
    expect(validateCoverageAgainstContract(contract, matching)).toEqual(matching);
    const invalid = structuredClone(matching); invalid.requirements[0]!.criteria[0]!.confidence = 1.1;
    expect(() => parseCoverageReport(invalid)).toThrow("Invalid coverage report");
  });

  it("handles valid and malformed adapter inputs deterministically", async () => {
    expect((await new JsonAdapter().load({ path: "conformance/valid/minimal-contract.json" })).id).toBeTruthy();
    await expect(new JsonAdapter().load({ path: "conformance/valid/markdown.md" })).rejects.toThrow();
    await expect(new MarkdownAdapter().load({ path: "conformance/valid/minimal-contract.json" })).rejects.toThrow("Markdown requires");
    await expect(new OpenSpecAdapter().load({ path: "conformance/valid/markdown.md" })).rejects.toThrow("openspec/specs");
  });

  it("rejects absolute paths, traversal, and oversized adapter input", async () => {
    await expect(new JsonAdapter().load({ path: "C:/Windows/win.ini" })).rejects.toThrow();
    await expect(new JsonAdapter().load({ path: "conformance/valid/minimal-contract.json", maxBytes: 1 })).rejects.toThrow("size limit");
  });

  it("produces stable SARIF fingerprints that change with evidence", async () => {
    const report = parseCoverageReport(await json("conformance/valid/coverage.json"));
    const first = toSarif(report);
    const changed = structuredClone(report); changed.requirements[0]!.criteria[0]!.evidence[0]!.startLine += 1;
    const second = toSarif(parseCoverageReport(changed));
    const fingerprint = (value: ReturnType<typeof toSarif>) => (value.runs[0]!.results as Array<{ partialFingerprints: Record<string, string> }>)[0]!.partialFingerprints["specbridge/v1"];
    expect(fingerprint(first)).not.toEqual(fingerprint(second));
    expect((first.runs[0]!.tool as { driver: { rules: unknown[] } }).driver.rules).toHaveLength(1);
  });

  it("keeps compatibility metadata synchronized with the release version", async () => {
    const compatibility = await json("compatibility.json");
    expect(compatibility.specbridgeVersion).toBe("0.2.0");
    expect(compatibility.schemaVersions.coverageReport).toEqual(["1.0"]);
  });

  it("runs the CLI with deterministic JSON output and a non-zero invalid exit", async () => {
    const valid = await exec("node", ["packages/cli/dist/index.js", "validate", "conformance/valid/minimal-contract.json", "--json"]);
    expect(JSON.parse(valid.stdout).schemaVersion).toBe("1.0");
    await expect(exec("node", ["packages/cli/dist/index.js", "validate", "conformance/valid/markdown.md", "--json"])).rejects.toMatchObject({ code: 1 });
  });
});
