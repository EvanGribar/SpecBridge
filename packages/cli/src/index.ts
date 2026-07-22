#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { adapters } from "@specbridge/adapters";
import { parseContract, parseCoverageReport } from "@specbridge/core";
import { toSarif } from "@specbridge/sarif";
const [command, file, ...rest] = process.argv.slice(2); const json = rest.includes("--json");
const print = (value: unknown) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
try { if (!command || !file) throw new Error("Usage: specbridge <extract|validate|validate-coverage|to-sarif|inspect> <file> [--json]"); if (command === "extract") { const adapter = adapters[extname(file) === ".json" ? "json" : file.includes("openspec") ? "openspec" : "markdown"]!; print(await adapter.load({ path: file })); } else { const raw = JSON.parse(await readFile(file, "utf8")); if (command === "validate") print(parseContract(raw)); else if (command === "validate-coverage") print(parseCoverageReport(raw)); else if (command === "to-sarif") { const sarif = toSarif(parseCoverageReport(raw)); const output = rest.find((argument) => argument.startsWith("--output="))?.slice(9); if (output) await writeFile(output, JSON.stringify(sarif, null, 2) + "\n"); print(sarif); } else if (command === "inspect") print({ kind: raw.requirements?.[0]?.criteria?.[0]?.status ? "coverage-report" : "requirement-contract", schemaVersion: raw.schemaVersion }); else throw new Error(`Unknown command: ${command}`); } } catch (error) { const message = error instanceof Error ? error.message : String(error); process.stderr.write(json ? JSON.stringify({ error: message }) + "\n" : `SpecBridge: ${message}\n`); process.exitCode = 1; }
