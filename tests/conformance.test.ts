import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MarkdownAdapter } from "@specbridge/adapters";
import { parseContract, parseCoverageReport } from "@specbridge/core";
import { toSarif } from "@specbridge/sarif";
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
describe("conformance", () => {
  it("accepts the minimal contract and JSON round trip", async () => expect(parseContract(await json("conformance/valid/minimal-contract.json"))).toEqual(await json("conformance/valid/minimal-contract.json")));
  it("rejects duplicate requirement IDs", async () => { const value = await json("conformance/invalid/duplicate-requirement-ids.json"); expect(() => parseContract(value)).toThrow("Invalid requirement contract"); });
  it("rejects violated criteria without evidence", async () => { const value = await json("conformance/invalid/violated-without-evidence.json"); expect(() => parseCoverageReport(value)).toThrow("Invalid coverage report"); });
  it("rejects missing identifiers, malformed ranges, invalid paths, and unknown versions", async () => { for (const path of ["conformance/invalid/missing-criterion-id.json", "conformance/invalid/unknown-schema-version.json", "conformance/invalid/invalid-path.json"]) { const value = await json(path); expect(() => parseContract(value)).toThrow(); } const range = await json("conformance/invalid/malformed-evidence-range.json"); expect(() => parseCoverageReport(range)).toThrow(); });
  it("loads limited Markdown", async () => expect((await new MarkdownAdapter().load({ path: "conformance/valid/markdown.md" })).requirements[0]?.criteria[0]?.id).toBe("enforce-limit"));
  it("emits stable actionable SARIF only", async () => { const report = parseCoverageReport(await json("conformance/valid/coverage.json")); const first = toSarif(report); expect(first.version).toBe("2.1.0"); expect((first.runs[0]?.results as unknown[]).length).toBe(1); expect((first.runs[0]?.results as Array<{ level: string }>)[0]?.level).toBe("error"); expect(toSarif(report)).toEqual(first); expect((toSarif(parseCoverageReport(await json("conformance/valid/non-actionable-coverage.json"))).runs[0]?.results as unknown[]).length).toBe(0); });
});
