#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname, resolve } from "node:path";
import { adapters } from "@specbridge/adapters";
import {
  AdjudicationRecordSchema,
  ExperimentConfigurationSchema,
  JsonFileAdapter,
  LiveBudgetLedger,
  RunResultSchema,
  SpecBridgeAdapter,
  SwarmReviewAdapter,
  readCase,
  runChangeEvaluation,
  scoreRun,
  summarizeExperiment,
  terminalChangeSummary,
  terminalSummary,
  validateCase,
  validateChangeTask,
  writeReports,
  MockAgentAdapter,
  LocalCommandAgentAdapter,
  getBenchmarkDataRoot,
  type BenchmarkCase,
  type ReviewerAdapter,
  type ChangeAgentAdapter,
} from "@specbridge/benchmark";
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

const benchmarkRoot = getBenchmarkDataRoot();
const outputRoot = resolve(process.cwd());
const benchmarkCaseRoot = (version: string) => resolve(benchmarkRoot, "benchmarks", version);
const benchmarkCases = (version: string): BenchmarkCase[] => {
  const directory = benchmarkCaseRoot(version);
  if (!existsSync(directory)) throw new Error(`Unknown benchmark version: ${version}`);
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(directory, entry.name, "case.json")))
    .map((entry) => readCase(resolve(directory, entry.name, "case.json")))
    .sort((a, b) => a.id.localeCompare(b.id));
};
const benchmarkPatch = (version: string, benchmarkCase: BenchmarkCase) => readFileSync(resolve(benchmarkCaseRoot(version), benchmarkCase.repository.patchPath), "utf8");
const option = (argv: string[], flag: string, fallback?: string): string | undefined => {
  const index = argv.findIndex((value) => value === flag || value.startsWith(`${flag}=`));
  if (index < 0) return fallback;
  return argv[index]!.includes("=") ? argv[index]!.slice(flag.length + 1) : argv[index + 1] ?? fallback;
};
const hasOption = (argv: string[], flag: string) => argv.includes(flag) || argv.some((value) => value.startsWith(`${flag}=`));
const required = (value: string | undefined, message: string): string => { if (!value) throw new Error(message); return value; };
const ensureParent = (file: string) => mkdirSync(resolve(file, ".."), { recursive: true });

async function loadLiveAdapter(kind: "single-agent" | "controlled-swarm", debateRounds: number, version?: string, model?: string): Promise<ReviewerAdapter> {
  const optionalPackage = "@specbridge/benchmark-adapters";
  try {
    const live = await import(optionalPackage);
    return kind === "single-agent"
      ? new live.SingleAgentAdapter(version, model)
      : new live.ControlledSwarmAdapter(debateRounds, version, model);
  } catch (error) {
    throw new Error(`Live benchmark adapters are optional and could not be loaded. Install ${optionalPackage} to use model-backed benchmarks. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function createBenchmarkReviewer(kind: string, input: string | undefined, fixture: string | undefined, dryRun: boolean, live: boolean, debateRounds: number, model?: string): Promise<ReviewerAdapter> {
  const resultFile = fixture ? resolve(benchmarkRoot, "fixtures", `${fixture}.json`) : input ? resolve(input) : undefined;
  if (fixture && !existsSync(resultFile!)) throw new Error(`Fixture does not exist: ${fixture}`);
  if (kind === "json-file") return new JsonFileAdapter(required(resultFile, "--input or --fixture is required for json-file"));
  if (kind === "specbridge") return new SpecBridgeAdapter(required(resultFile, "--input or --fixture is required for specbridge"));
  if (kind === "swarm-review" && resultFile) return new SwarmReviewAdapter(resultFile);
  if (kind === "single-agent" || kind === "controlled-swarm" || (kind === "swarm-review" && live)) {
    if (!live && !dryRun) throw new Error("Model-backed benchmark reviewers require --live; use --dry-run or an offline input/fixture for a provider-free run.");
    if (dryRun && !live) return { name: kind, version: "dry-run", review: async () => ({ findings: [], metadata: { dryRun: true } }) };
    return loadLiveAdapter(kind === "single-agent" ? "single-agent" : "controlled-swarm", debateRounds, undefined, model);
  }
  throw new Error(`Unknown reviewer: ${kind}`);
}

async function runBenchmarkReview(argv: string[]): Promise<void> {
  const version = option(argv, "--benchmark", "v0.2")!;
  const reviewerName = required(option(argv, "--reviewer"), "Usage: specbridge bench review --reviewer <json-file|specbridge|swarm-review|single-agent|controlled-swarm>");
  const maxCases = Number(option(argv, "--max-cases", "10"));
  const maxCalls = Number(option(argv, "--max-calls", "10"));
  const maxOutputTokens = Number(option(argv, "--max-output-tokens", "1500"));
  if (!Number.isInteger(maxCases) || maxCases < 1 || maxCases > maxCalls) throw new Error("max-cases must be a positive integer no greater than max-calls");
  const selected = benchmarkCases(version).slice(0, maxCases);
  const dryRun = hasOption(argv, "--dry-run");
  const reviewer = await createBenchmarkReviewer(reviewerName, option(argv, "--input"), option(argv, "--fixture"), dryRun, hasOption(argv, "--live"), Number(option(argv, "--debate-rounds", "0")), option(argv, "--model"));
  const outputs = [];
  let totalCost = 0;
  for (const benchmarkCase of selected) {
    const output = await reviewer.review({ benchmarkVersion: version, case: benchmarkCase, patch: benchmarkPatch(version, benchmarkCase), dryRun, maxOutputTokens });
    totalCost += output.estimatedCostUsd ?? 0;
    const maxCost = option(argv, "--max-cost");
    if (maxCost && totalCost > Number(maxCost)) throw new Error("Run exceeds --max-cost");
    outputs.push({ caseId: benchmarkCase.id, raw: output.raw ?? output, output });
  }
  const outputPath = resolve(option(argv, "--output", resolve(outputRoot, "results", "benchmarks", "run.json"))!);
  ensureParent(outputPath);
  const run = RunResultSchema.parse({ schemaVersion: "1", benchmarkVersion: version, reviewer: { name: reviewer.name, version: reviewer.version }, createdAt: new Date().toISOString(), configuration: { dryRun, maxCalls, maxOutputTokens, maxCostUsd: option(argv, "--max-cost") ? Number(option(argv, "--max-cost")) : null, benchmarkVersion: version }, cases: outputs });
  writeFileSync(outputPath, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`Saved ${outputs.length} case result(s) to ${outputPath}`);
}

function validateBenchmarks(argv: string[]): void {
  const version = option(argv, "--benchmark", "v0.2")!;
  const rootForVersion = benchmarkCaseRoot(version);
  const selected = benchmarkCases(version);
  const errors = selected.flatMap((item) => validateCase(rootForVersion, item));
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; return; }
  console.log(`Validated ${selected.length} cases (${version}).`);
}

function scoreBenchmarkRun(argv: string[]): void {
  const results = required(option(argv, "--results"), "Usage: specbridge bench score --results <file>");
  const run = RunResultSchema.parse(JSON.parse(readFileSync(resolve(results), "utf8")));
  const scored = scoreRun(run, benchmarkCases(run.benchmarkVersion));
  console.log(terminalSummary(scored));
  const output = option(argv, "--output");
  if (output) { const outputPath = resolve(output); ensureParent(outputPath); writeFileSync(outputPath, `${JSON.stringify(scored, null, 2)}\n`); }
}

function reportBenchmarkRun(argv: string[]): void {
  const results = required(option(argv, "--results"), "Usage: specbridge bench report --results <file>");
  const run = RunResultSchema.parse(JSON.parse(readFileSync(resolve(results), "utf8")));
  const scored = scoreRun(run, benchmarkCases(run.benchmarkVersion));
  const jsonPath = resolve(option(argv, "--json", resolve(outputRoot, "results", "benchmarks", "report.json"))!);
  const htmlPath = resolve(option(argv, "--html", resolve(outputRoot, "results", "benchmarks", "report.html"))!);
  ensureParent(jsonPath); ensureParent(htmlPath); writeReports(scored, jsonPath, htmlPath);
  console.log(terminalSummary(scored)); console.log(`Wrote ${jsonPath} and ${htmlPath}`);
}

async function runChangeBenchmark(argv: string[]): Promise<void> {
  const taskPath = resolve(required(option(argv, "--task"), "Usage: specbridge bench change run --task <file>"));
  const agentType = option(argv, "--agent", "mock");
  let agent: ChangeAgentAdapter;
  if (agentType === "mock") agent = new MockAgentAdapter({ agentId: "mock", patchFile: option(argv, "--agent-patch") ? resolve(option(argv, "--agent-patch")!) : undefined });
  else if (agentType === "command") {
    const executable = required(option(argv, "--agent-exec"), "--agent-exec is required when --agent command is specified");
    agent = new LocalCommandAgentAdapter({ agentId: executable, executable, args: option(argv, "--agent-args")?.split(",") ?? [] });
  } else throw new Error(`Unknown agent type: ${agentType}`);
  const result = await runChangeEvaluation({ taskFilePath: taskPath, agent });
  console.log(terminalChangeSummary(result));
  const output = option(argv, "--output");
  if (output) { const outputPath = resolve(output); ensureParent(outputPath); writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`); console.log(`Saved change evaluation result to ${outputPath}`); }
  if (result.processResult !== "passed") process.exitCode = 1;
}

function validateChangeBenchmark(argv: string[]): void {
  const taskPath = resolve(required(option(argv, "--task"), "Usage: specbridge bench change validate --task <file>"));
  const result = validateChangeTask(taskPath);
  if (!result.valid) { console.error(`Task validation failed:\n${result.errors.join("\n")}`); process.exitCode = 1; }
  else console.log(`Task '${result.task.id}' is valid.`);
}

async function runBenchmarkExperiment(argv: string[]): Promise<void> {
  const experimentDirectory = resolve(benchmarkRoot, "experiments", "v0.3");
  const configOption = option(argv, "--config");
  const configPaths = hasOption(argv, "--all") ? readdirSync(experimentDirectory).filter((file) => file.endsWith(".json")).map((file) => resolve(experimentDirectory, file)) : [resolve(required(configOption, "Usage: specbridge bench experiment --config <file> or --all"))];
  const dryRun = hasOption(argv, "--dry-run");
  const fixture = option(argv, "--fixture");
  const live = hasOption(argv, "--live");
  const outputDirectory = resolve(option(argv, "--output-dir", resolve(outputRoot, "results", "benchmarks", "v0.3", "runs"))!);
  for (const configPath of configPaths) {
    const config = ExperimentConfigurationSchema.parse(JSON.parse(readFileSync(configPath, "utf8")));
    const cases = benchmarkCases(config.benchmarkVersion).filter((item) => config.caseIds.includes(item.id));
    const plannedCalls = cases.length * config.repetitions * (config.reviewerType === "single-agent" ? 1 : config.agentCount + config.debateRounds + 1);
    console.log(`${config.id}: ${cases.length} cases x ${config.repetitions} repetitions; ${plannedCalls} planned calls (${config.maxCalls} ceiling); ${config.model}; maximum cost $${config.maxEstimatedCostUsd.toFixed(2)}.`);
    if (dryRun) continue;
    if (!fixture && !live) throw new Error("Live experiments require --live; use --dry-run or --fixture for offline execution.");
    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      const runId = `${config.id}-r${repetition}-${randomUUID()}`;
      const outputPath = resolve(outputDirectory, `${runId}.json`);
      if (existsSync(outputPath)) throw new Error(`Refusing to overwrite completed result: ${outputPath}`);
      const reviewer = fixture ? new JsonFileAdapter(resolve(benchmarkRoot, "fixtures", `${fixture}.json`)) : await loadLiveAdapter(config.reviewerType === "single-agent" ? "single-agent" : "controlled-swarm", config.debateRounds, config.reviewerVersion, config.model);
      const outputs = [];
      let spent = 0;
      for (const benchmarkCase of cases) {
        try {
          const output = await reviewer.review({ benchmarkVersion: config.benchmarkVersion, case: benchmarkCase, patch: benchmarkPatch(config.benchmarkVersion, benchmarkCase), maxOutputTokens: config.maxOutputTokens });
          spent += output.estimatedCostUsd ?? 0;
          if (spent > config.maxEstimatedCostUsd) throw new Error("configured cost ceiling exceeded");
          outputs.push({ caseId: benchmarkCase.id, raw: output.raw ?? output, output });
        } catch (error) {
          outputs.push({ caseId: benchmarkCase.id, raw: null, output: { findings: [], metadata: { failure: error instanceof Error ? error.message : String(error) } } });
        }
      }
      ensureParent(outputPath);
      writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: "1", runId, configurationId: config.id, repetition, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), benchmarkVersion: config.benchmarkVersion, reviewer: { name: reviewer.name, version: reviewer.version }, createdAt: new Date().toISOString(), configuration: config, cases: outputs }, null, 2)}\n`);
      console.log(`Saved ${runId} (${outputs.length} cases) to ${outputPath}`);
    }
  }
}

function scoreExperiments(argv: string[]): void {
  const runsDirectory = resolve(option(argv, "--runs", resolve(outputRoot, "results", "benchmarks", "v0.3", "runs"))!);
  const outputPath = resolve(option(argv, "--output", resolve(outputRoot, "results", "benchmarks", "v0.3", "automatic-results.json"))!);
  const scores = readdirSync(runsDirectory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => { const run = RunResultSchema.parse(JSON.parse(readFileSync(resolve(runsDirectory, entry.name), "utf8"))); return scoreRun(run, benchmarkCases(run.benchmarkVersion)); });
  ensureParent(outputPath); writeFileSync(outputPath, `${JSON.stringify(scores, null, 2)}\n`); console.log(`Scored ${scores.length} run(s) to ${outputPath}`);
}

function reportExperiments(argv: string[]): void {
  const scores = JSON.parse(readFileSync(resolve(required(option(argv, "--scores"), "Usage: specbridge bench experiment-report --scores <file>")), "utf8"));
  const summaries = summarizeExperiment(scores);
  const outputDirectory = resolve(option(argv, "--output-dir", resolve(outputRoot, "results", "benchmarks", "v0.3"))!);
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(resolve(outputDirectory, "summary.json"), `${JSON.stringify({ schemaVersion: "1", generatedAt: new Date().toISOString(), status: "preliminary", automatic: summaries, humanAdjudicated: null }, null, 2)}\n`);
  console.log(`Wrote experiment summary to ${resolve(outputDirectory, "summary.json")}`);
}

function adjudicateExperiment(argv: string[]): void {
  const record = AdjudicationRecordSchema.parse(JSON.parse(readFileSync(resolve(required(option(argv, "--record"), "Usage: specbridge bench adjudicate --record <file>")), "utf8")));
  const outputPath = resolve(option(argv, "--output", resolve(outputRoot, "results", "benchmarks", "v0.3", "adjudications", "records.jsonl"))!);
  ensureParent(outputPath); appendFileSync(outputPath, `${JSON.stringify(record)}\n`); console.log(`Appended adjudication for ${record.caseId} / ${record.runId}`);
}

function benchmarkHelp(): void {
  process.stdout.write(`SpecBridge benchmark commands\n\nUsage:\n  specbridge bench review --reviewer <name> [options]\n  specbridge bench change <validate|run> --task <file> [options]\n  specbridge bench validate [--benchmark <version>]\n  specbridge bench list [--benchmark <version>]\n  specbridge bench score --results <file>\n  specbridge bench report --results <file>\n\nReviewers:\n  json-file, specbridge, swarm-review (offline input), single-agent, controlled-swarm (optional live adapters)\n\nAdvanced:\n  experiment, experiment-score, experiment-report, adjudicate, smoke-budget-*\n`);
}

async function handleBench(argv: string[]): Promise<void> {
  const subcommand = argv[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h") return benchmarkHelp();
  if (subcommand === "review") return runBenchmarkReview(argv.slice(1));
  if (subcommand === "validate") return validateBenchmarks(argv.slice(1));
  if (subcommand === "list") return benchmarkCases(option(argv.slice(1), "--benchmark", "v0.2")!).forEach((item) => console.log(`${item.id}\t${item.title}`));
  if (subcommand === "score") return scoreBenchmarkRun(argv.slice(1));
  if (subcommand === "report") return reportBenchmarkRun(argv.slice(1));
  if (subcommand === "experiment") return runBenchmarkExperiment(argv.slice(1));
  if (subcommand === "experiment-score") return scoreExperiments(argv.slice(1));
  if (subcommand === "experiment-report") return reportExperiments(argv.slice(1));
  if (subcommand === "adjudicate") return adjudicateExperiment(argv.slice(1));
  if (subcommand === "change") {
    const mode = argv[1];
    if (mode === "validate") return validateChangeBenchmark(argv.slice(2));
    if (mode === "run") return runChangeBenchmark(argv.slice(2));
    throw new Error("Usage: specbridge bench change <validate|run> --task <file>");
  }
  if (subcommand === "smoke-budget-init") { console.log(`Initialized smoke ledger: measured $${new LiveBudgetLedger(resolve(outputRoot, "results", "benchmarks", "v0.3", "budget-ledger.json")).initializeRecordedSmokeSpend().measuredUsd.toFixed(6)}`); return; }
  if (subcommand === "smoke-budget-status" || subcommand === "smoke-budget-audit") { const status = new LiveBudgetLedger(resolve(outputRoot, "results", "benchmarks", "v0.3", "budget-ledger.json")).audit(); console.log(`${subcommand === "smoke-budget-audit" ? "Smoke budget ledger audit passed; remaining" : "Remaining"} $${status.remainingUsd.toFixed(6)}`); return; }
  throw new Error(`Unknown benchmark command: ${subcommand}`);
}

async function main() {
  try {
    if (!command || command === "--help" || command === "-h") {
      process.stdout.write(
        `SpecBridge: Auditor for repository instructions used by AI coding agents\n\n` +
          `Usage:\n` +
        `  specbridge audit [options]\n` +
          `  specbridge bench <review|change|validate|list|score|report>\n` +
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

    if (command === "bench") {
      await handleBench(args.slice(1));
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
