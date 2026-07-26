#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { adapters } from "@specbridge/adapters";
import { parseContract, parseCoverageReport } from "@specbridge/core";
import { scanRepository } from "@specbridge/repository";
import { ALL_RULES, runAudit } from "@specbridge/rules";
import { auditReportToSarif, toSarif } from "@specbridge/sarif";

const args = process.argv.slice(2);
const command = args[0];

function getArgValue(flag: string): string | undefined {
  const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
  if (idx === -1) return undefined;
  if (args[idx]!.includes("=")) return args[idx]!.split("=")[1];
  return args[idx + 1];
}

const print = (value: unknown) => process.stdout.write(`${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`);

async function main() {
  try {
    if (!command || command === "--help" || command === "-h") {
      process.stdout.write(
        `SpecBridge: Auditor for repository instructions used by AI coding agents\n\n` +
          `Usage:\n` +
          `  specbridge audit [options]\n` +
          `  specbridge explain <finding-id | rule-id>\n` +
          `  specbridge extract <file>\n` +
          `  specbridge validate <file>\n` +
          `  specbridge validate-coverage <file>\n` +
          `  specbridge to-sarif <file>\n` +
          `  specbridge inspect <file>\n\n` +
          `Audit Options:\n` +
          `  --path <dir>         Repository directory to audit (default: .)\n` +
          `  --format <format>    Output format: human, json, sarif (default: human)\n` +
          `  --strict             Exit with code 1 if blocking errors are found\n` +
          `  --no-score           Disable repository guidance score calculation\n`
      );
      return;
    }

    if (command === "audit") {
      const targetPath = getArgValue("--path") ?? getArgValue("-p") ?? ".";
      const format = getArgValue("--format") ?? (args.includes("--json") ? "json" : args.includes("--sarif") ? "sarif" : "human");
      const strict = args.includes("--strict");
      const noScore = args.includes("--no-score");

      const repoInventory = await scanRepository(targetPath);
      const auditReport = runAudit(repoInventory);

      if (noScore) {
        delete auditReport.score;
      }

      if (format === "json") {
        print(auditReport);
      } else if (format === "sarif") {
        print(auditReportToSarif(auditReport));
      } else {
        // Human readable terminal output
        let out = "SpecBridge audit\n\n";

        if (auditReport.score) {
          out += `Repository guidance score: ${auditReport.score.value}/100\n\n`;
        }

        const errors = auditReport.findings.filter((f) => f.severity === "error");
        const warnings = auditReport.findings.filter((f) => f.severity === "warning");
        const info = auditReport.findings.filter((f) => f.severity === "info");

        if (errors.length > 0) {
          out += "Errors\n";
          for (const err of errors) {
            const loc = err.evidence[0] ? `${err.evidence[0].file}${err.evidence[0].line ? `:${err.evidence[0].line}` : ""}` : "";
            out += `- [${err.ruleId}] ${loc ? `${loc}: ` : ""}${err.description}\n`;
          }
          out += "\n";
        }

        if (warnings.length > 0) {
          out += "Warnings\n";
          for (const warn of warnings) {
            const loc = warn.evidence[0] ? `${warn.evidence[0].file}${warn.evidence[0].line ? `:${warn.evidence[0].line}` : ""}` : "";
            out += `- [${warn.ruleId}] ${loc ? `${loc}: ` : ""}${warn.description}\n`;
          }
          out += "\n";
        }

        if (info.length > 0) {
          out += "Informational\n";
          for (const inf of info) {
            const loc = inf.evidence[0] ? `${inf.evidence[0].file}${inf.evidence[0].line ? `:${inf.evidence[0].line}` : ""}` : "";
            out += `- [${inf.ruleId}] ${loc ? `${loc}: ` : ""}${inf.description}\n`;
          }
          out += "\n";
        }

        out += `Summary\n${auditReport.summary.errors} errors, ${auditReport.summary.warnings} warnings, ${auditReport.summary.info} informational findings\n`;
        process.stdout.write(out);
      }

      if (strict && auditReport.summary.errors > 0) {
        process.exitCode = 1;
      }
      return;
    }

    if (command === "explain") {
      const findingOrRuleId = args[1];
      if (!findingOrRuleId) {
        throw new Error("Usage: specbridge explain <finding-id | rule-id>");
      }

      const ruleId = findingOrRuleId.split(":")[0]!;
      const rule = ALL_RULES.find((r) => r.id === ruleId);

      if (!rule) {
        process.stdout.write(`Unknown rule ID '${ruleId}'.\n\nAvailable rules:\n` + ALL_RULES.map((r) => `- ${r.id}: ${r.name}`).join("\n") + "\n");
        process.exitCode = 1;
        return;
      }

      let explanation = `Rule: ${rule.id} (${rule.name})\n`;
      explanation += `Default Severity: ${rule.defaultSeverity}\n\n`;
      explanation += `Description:\n${rule.description}\n\n`;

      if (rule.id === "missing-path") {
        explanation += `Why this matters:\n` +
          `AI coding agents rely on referenced files and paths in AGENTS.md, CLAUDE.md, or Copilot instructions.\n` +
          `When instructions refer to non-existent paths (e.g. deleted apps or renamed modules), agents waste context and make hallucinated edits.\n\n` +
          `Remediation:\n` +
          `Update the path reference in your instruction file or restore the missing path.\n`;
      } else if (rule.id === "package-manager-conflict") {
        explanation += `Why this matters:\n` +
          `Invoking 'npm test' in a pnpm or yarn monorepo causes lockfile desynchronization and broken dependency resolution.\n\n` +
          `Remediation:\n` +
          `Update your instruction file to recommend the repository's configured package manager.\n`;
      } else if (rule.id === "runtime-conflict") {
        explanation += `Why this matters:\n` +
          `AI agents generating code targeted for Node 20 will use deprecated or incompatible APIs if the repository requires Node >=24.\n\n` +
          `Remediation:\n` +
          `Sync Node.js engine declarations in package.json and agent instruction files.\n`;
      } else {
        explanation += `Remediation:\nReview instruction file content against repository configuration and update stale guidance.\n`;
      }

      process.stdout.write(explanation);
      return;
    }

    // Legacy commands
    const file = args[1];
    const json = args.includes("--json");

    if (!file) throw new Error("Usage: specbridge <audit|explain|extract|validate|validate-coverage|to-sarif|inspect> [file] [--json]");

    if (command === "extract") {
      const adapter = adapters[extname(file) === ".json" ? "json" : file.includes("openspec") ? "openspec" : "markdown"]!;
      print(await adapter.load({ path: file }));
    } else {
      const raw = JSON.parse(await readFile(file, "utf8"));
      if (command === "validate") print(parseContract(raw));
      else if (command === "validate-coverage") print(parseCoverageReport(raw));
      else if (command === "to-sarif") {
        const sarif = toSarif(parseCoverageReport(raw));
        const output = args.find((argument) => argument.startsWith("--output="))?.slice(9);
        if (output) await writeFile(output, JSON.stringify(sarif, null, 2) + "\n");
        print(sarif);
      } else if (command === "inspect") print({ kind: raw.requirements?.[0]?.criteria?.[0]?.status ? "coverage-report" : "requirement-contract", schemaVersion: raw.schemaVersion });
      else throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const json = args.includes("--json");
    process.stderr.write(json ? JSON.stringify({ error: message }) + "\n" : `SpecBridge: ${message}\n`);
    process.exitCode = 1;
  }
}

main();
