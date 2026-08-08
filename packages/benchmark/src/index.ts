import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, relative, sep, dirname, isAbsolute } from "node:path";
import { z } from "zod";
import { parse as parseYaml } from "yaml";
import { CoverageStatusSchema, CriterionCoverageSchema, type CoverageStatus } from "@specbridge/core";

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ExpectedFindingSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: SeveritySchema,
  file: z.string().min(1),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  requirementReference: z.string().min(1),
  /** Stable SpecBridge coordinates. Optional to preserve v0.1/v0.2 cases. */
  requirementId: z.string().min(1).optional(),
  criterionId: z.string().min(1).optional(),
  acceptableMatches: z.array(z.string().min(1)).default([])
}).refine((finding) => !finding.endLine || !finding.startLine || finding.endLine >= finding.startLine, {
  message: "endLine must not precede startLine", path: ["endLine"]
});

export const BenchmarkCaseSchema = z.object({
  schemaVersion: z.literal("1"),
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  requirement: z.string().min(1),
  seededViolation: z.string().min(1).optional(),
  whyItMatters: z.string().min(1).optional(),
  repository: z.object({ baseCommit: z.string().min(1), patchPath: z.string().min(1) }),
  expectedFindings: z.array(ExpectedFindingSchema).min(1).superRefine((items, ctx) => {
    const seen = new Set<string>();
    const criteria = new Set<string>();
    items.forEach((item, index) => { if (seen.has(item.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate expected finding id", path: [index, "id"] }); seen.add(item.id); const key = item.requirementId && item.criterionId ? `${item.requirementId}:${item.criterionId}` : undefined; if (key && criteria.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate expected SpecBridge criterion mapping", path: [index, "criterionId"] }); if (key) criteria.add(key); });
  }),
  manualMappings: z.array(z.object({ expectedFindingId: z.string().min(1), findingId: z.string().min(1) })).default([]),
  distractors: z.array(z.object({ description: z.string().min(1), reasonNotAnIssue: z.string().min(1) })).default([])
});
export type BenchmarkCase = z.infer<typeof BenchmarkCaseSchema>;

/**
 * Locate the versioned benchmark material in a workspace checkout or packed
 * package. The CLI uses this for read-only case/fixture/config discovery.
 */
export function getBenchmarkDataRoot(): string {
  const packagedRoot = resolve(dirname(import.meta.dirname), "data");
  return existsSync(resolve(packagedRoot, "benchmarks")) ? packagedRoot : resolve(import.meta.dirname, "../../..");
}

export const NormalizedFindingSchema = z.object({
  id: z.string().optional(), title: z.string().min(1), description: z.string().min(1), severity: z.string().optional(),
  file: z.string().optional(), startLine: z.number().int().positive().optional(), endLine: z.number().int().positive().optional(),
  confidence: z.number().min(0).max(1).optional(), requirementReference: z.string().optional()
});
export type NormalizedFinding = z.infer<typeof NormalizedFindingSchema>;

/** The benchmark uses the canonical SpecBridge coverage status vocabulary. */
export const SpecBridgeStatusSchema = CoverageStatusSchema;
export type SpecBridgeStatus = CoverageStatus;
/** Compatibility name retained for benchmark result files; the schema is canonical. */
export const CriterionResultSchema = CriterionCoverageSchema.and(z.object({ requirementId: z.string().min(1) }));
export type CriterionResult = z.infer<typeof CriterionResultSchema>;

export const ReviewOutputSchema = z.object({
  findings: z.array(NormalizedFindingSchema), raw: z.unknown().optional(), runtimeMs: z.number().nonnegative().optional(), estimatedCostUsd: z.number().nonnegative().optional(), metadata: z.record(z.unknown()).default({}), criterionResults: z.array(CriterionResultSchema).optional()
});
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
export type ReviewInput = { benchmarkVersion: string; case: BenchmarkCase; patch: string; dryRun?: boolean; maxOutputTokens?: number };
export type ReviewerAdapter = { name: string; version?: string; review(input: ReviewInput): Promise<ReviewOutput> };

export const RunResultSchema = z.object({
  schemaVersion: z.literal("1"), benchmarkVersion: z.string(), reviewer: z.object({ name: z.string(), version: z.string().optional() }),
  createdAt: z.string().optional().default(""), runId: z.string().optional(), configurationId: z.string().optional(), repetition: z.number().int().positive().optional(), startedAt: z.string().optional(), completedAt: z.string().optional(), configuration: z.record(z.unknown()).default({}), cases: z.array(z.object({ caseId: z.string(), raw: z.unknown(), output: ReviewOutputSchema }))
});
export type RunResult = z.infer<typeof RunResultSchema>;

/** Secret-free, committed description of one controlled v0.3 condition. */
export const ExperimentConfigurationSchema = z.object({
  schemaVersion: z.literal("1"), id: z.string().regex(/^[a-z0-9-]+$/), version: z.string().min(1),
  reviewerType: z.enum(["single-agent", "swarm-review"]), reviewerVersion: z.string().min(1), provider: z.string().min(1), model: z.string().min(1),
  temperature: z.number().min(0).max(2), maxOutputTokens: z.number().int().positive(), maxCalls: z.number().int().positive(), maxEstimatedCostUsd: z.number().positive(),
  agentCount: z.number().int().positive(), agentMandates: z.array(z.string().min(1)).min(1), debateRounds: z.number().int().min(0), confidenceThreshold: z.number().min(0).max(1),
  principal: z.record(z.unknown()), promptVersion: z.string().min(1), benchmarkVersion: z.literal("v0.2"), caseIds: z.array(z.string().min(1)).min(1), repetitions: z.number().int().positive(),
  environmentMetadataFields: z.array(z.string().min(1)).min(1), notes: z.string().min(1)
}).superRefine((config, ctx) => {
  if (config.reviewerType === "single-agent" && (config.agentCount !== 1 || config.debateRounds !== 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "single-agent must have one agent and zero debate rounds" });
  if (config.reviewerType === "swarm-review" && config.agentCount < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "swarm-review must have at least two agents" });
});
export type ExperimentConfiguration = z.infer<typeof ExperimentConfigurationSchema>;

export const AdjudicationRecordSchema = z.object({
  caseId: z.string(), runId: z.string(), submittedFindingId: z.string().nullable().optional(), expectedFindingId: z.string().nullable().optional(),
  automaticClassification: z.enum(["false-positive", "false-negative", "alias-match", "file-line-match", "duplicate", "severity-disagreement"]),
  humanClassification: z.enum(["correct-match", "valid-finding-missed-by-matcher", "invalid-finding", "duplicate", "partially-correct", "severity-disagreement", "ambiguous", "requires-case-revision"]),
  rationale: z.string().min(1), reviewer: z.string().min(1), timestamp: z.string().datetime()
});
export type AdjudicationRecord = z.infer<typeof AdjudicationRecordSchema>;

export function readCase(filePath: string): BenchmarkCase {
  return BenchmarkCaseSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
}
export function isSafeRelativePath(root: string, candidate: string): boolean {
  const target = resolve(root, candidate); const rel = relative(root, target); return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== "..";
}
export function validateCase(caseRoot: string, caseDefinition: BenchmarkCase): string[] {
  const errors: string[] = [];
  const historicalReferenceRef = /^reference-saas-v\d+\.\d+$/;
  try {
    execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: caseRoot, stdio: "ignore" });
    try { execFileSync("git", ["rev-parse", "--verify", `${caseDefinition.repository.baseCommit}^{commit}`], { cwd: caseRoot, stdio: "ignore" }); }
    catch {
      // The consolidated cases retain SpecBench's historical reference-SaaS
      // labels. They are provenance when that tag is not carried into the
      // SpecBridge repository; arbitrary unresolved refs still fail closed.
      if (!historicalReferenceRef.test(caseDefinition.repository.baseCommit)) errors.push(`${caseDefinition.id}: baseCommit does not resolve to a local commit`);
    }
  } catch {
    // Source archives and package consumers may not include Git metadata. The
    // patch and finding-path checks below still provide deterministic validation.
  }
  if (!isSafeRelativePath(caseRoot, caseDefinition.repository.patchPath)) errors.push(`${caseDefinition.id}: patchPath escapes benchmark directory`);
  else if (!existsSync(resolve(caseRoot, caseDefinition.repository.patchPath))) errors.push(`${caseDefinition.id}: patch does not exist`);
  const patchFile = resolve(caseRoot, caseDefinition.repository.patchPath);
  const patch = existsSync(patchFile) ? readFileSync(patchFile, "utf8").replaceAll("\\", "/") : "";
  for (const finding of caseDefinition.expectedFindings) {
    if (finding.file.startsWith("/") || finding.file.includes("..")) errors.push(`${caseDefinition.id}/${finding.id}: invalid file reference`);
    else if (patch && !patch.includes(`b/${finding.file}`)) errors.push(`${caseDefinition.id}/${finding.id}: file is not changed by its patch`);
  }
  if (caseRoot.replaceAll("\\", "/").endsWith("/v0.2")) {
    if (!caseDefinition.seededViolation) errors.push(`${caseDefinition.id}: seededViolation is required for v0.2`);
    if (!caseDefinition.whyItMatters) errors.push(`${caseDefinition.id}: whyItMatters is required for v0.2`);
    if (!caseDefinition.distractors.length) errors.push(`${caseDefinition.id}: at least one distractor is required for v0.2`);
  }
  return errors;
}

/* --- Change Task Schemas & Types --- */

export const ChangeTaskRequirementCheckSchema = z.object({
  type: z.enum(["test", "command"]),
  command: z.string().min(1)
});
export type ChangeTaskRequirementCheck = z.infer<typeof ChangeTaskRequirementCheckSchema>;

export const ChangeTaskRequirementSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["blocking", "warning", "info"]).default("blocking"),
  checks: z.array(ChangeTaskRequirementCheckSchema).min(1)
});
export type ChangeTaskRequirement = z.infer<typeof ChangeTaskRequirementSchema>;

export const ChangeTaskSchema = z.object({
  version: z.literal(1, { errorMap: () => ({ message: "Unknown schema version" }) }),
  id: z.string().min(1),
  mode: z.literal("change", { errorMap: () => ({ message: "Mode must be 'change'" }) }),
  repository: z.object({
    fixture: z.string().min(1)
  }),
  task: z.object({
    prompt: z.string().min(1)
  }),
  requirements: z.array(ChangeTaskRequirementSchema).min(1),
  validation: z.object({
    commands: z.array(z.string().min(1)).default([])
  }).default({ commands: [] }),
  budgets: z.object({
    timeout_seconds: z.number().positive().default(120),
    max_output_bytes: z.number().positive().default(1000000)
  }).default({ timeout_seconds: 120, max_output_bytes: 1000000 })
});
export type ChangeTask = z.infer<typeof ChangeTaskSchema>;

export function readChangeTask(filePath: string): ChangeTask {
  if (!existsSync(filePath)) {
    throw new Error(`Task file not found: ${filePath}`);
  }
  const content = readFileSync(filePath, "utf8");
  const rawData = parseYaml(content);
  return ChangeTaskSchema.parse(rawData);
}

export function validateChangeTask(taskFilePath: string): { valid: true; task: ChangeTask; errors: [] } | { valid: false; task?: undefined; errors: string[] } {
  let rawData: unknown;
  try {
    if (!existsSync(taskFilePath)) {
      return { valid: false, errors: [`Task file does not exist: ${taskFilePath}`] };
    }
    const content = readFileSync(taskFilePath, "utf8");
    rawData = parseYaml(content);
  } catch (err: any) {
    return { valid: false, errors: [`Failed to read/parse YAML: ${err?.message || String(err)}`] };
  }

  if (typeof rawData === "object" && rawData !== null && "version" in rawData) {
    if ((rawData as any).version !== 1) {
      return { valid: false, errors: [`Unknown schema version: ${(rawData as any).version}`] };
    }
  }

  const parseResult = ChangeTaskSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { valid: false, errors: parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`) };
  }

  const task = parseResult.data;
  const errors: string[] = [];

  const fixturePath = task.repository.fixture;
  if (isAbsolute(fixturePath)) {
    errors.push(`Absolute fixture paths are not allowed: ${fixturePath}`);
  }
  if (fixturePath.startsWith("http://") || fixturePath.startsWith("https://") || fixturePath.startsWith("git@")) {
    errors.push(`Remote repository URLs are not supported: ${fixturePath}`);
  }

  const fixtureRoots = getChangeFixtureRoots(taskFilePath);
  const safeFixtureRoots = fixtureRoots.filter((root) => isSafeRelativePath(root, fixturePath));
  const resolvedFixture = safeFixtureRoots.map((root) => resolve(root, fixturePath)).find((candidate) => existsSync(candidate)) ?? resolve(fixtureRoots[0]!, fixturePath);

  if (fixturePath.includes("..") && safeFixtureRoots.length === 0) {
    errors.push(`Repository path traversal detected in fixture: ${fixturePath}`);
  }

  if (!existsSync(resolvedFixture)) {
    errors.push(`Fixture directory does not exist: ${resolvedFixture}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, task, errors: [] };
}

/** Resolve task fixtures from a source checkout or the benchmark package's data directory. */
export function getChangeFixtureRoots(taskFilePath: string): string[] {
  const taskDir = resolve(dirname(taskFilePath));
  const roots = [taskDir];
  let cursor = taskDir;
  while (cursor !== resolve(cursor, "..")) {
    if (existsSync(resolve(cursor, "package.json"))) {
      const packagedData = resolve(cursor, "data");
      roots.push(cursor);
      if (existsSync(packagedData)) roots.push(packagedData);
      break;
    }
    cursor = resolve(cursor, "..");
  }
  return [...new Set(roots)];
}

export function resolveChangeFixture(taskFilePath: string, fixturePath: string): string {
  const roots = getChangeFixtureRoots(taskFilePath);
  return roots.map((root) => resolve(root, fixturePath)).find((candidate, index) => isSafeRelativePath(roots[index]!, fixturePath) && existsSync(candidate)) ?? resolve(roots[0]!, fixturePath);
}

export const ChangeRequirementStatusSchema = z.enum(["satisfied", "violated", "not_verifiable"]);
export type ChangeRequirementStatus = z.infer<typeof ChangeRequirementStatusSchema>;

export const ChangeRequirementResultSchema = z.object({
  id: z.string(),
  description: z.string(),
  severity: z.string(),
  status: ChangeRequirementStatusSchema,
  checks: z.array(z.object({
    type: z.string(),
    command: z.string(),
    exitCode: z.number(),
    passed: z.boolean(),
    stdout: z.string(),
    stderr: z.string(),
    runtimeMs: z.number()
  }))
});
export type ChangeRequirementResult = z.infer<typeof ChangeRequirementResultSchema>;

export const ChangeRunResultSchema = z.object({
  schemaVersion: z.literal("1"),
  taskId: z.string(),
  mode: z.literal("change"),
  agentId: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  processResult: z.enum(["passed", "failed", "timeout", "error"]),
  agent: z.object({
    agentId: z.string(),
    executable: z.string(),
    args: z.array(z.string()),
    inputMechanism: z.string(),
    workingDirectory: z.string(),
    allowedEnv: z.array(z.string()),
    timeoutMs: z.number(),
    exitCode: z.number(),
    stdout: z.string(),
    stderr: z.string(),
    runtimeMs: z.number(),
    tokens: z.object({ inputTokens: z.number().optional(), outputTokens: z.number().optional() }).optional(),
    costUsd: z.number().optional()
  }),
  patch: z.object({
    filesChanged: z.number(),
    insertions: z.number(),
    deletions: z.number(),
    diff: z.string(),
    changedFiles: z.array(z.string())
  }),
  validation: z.object({
    totalCommands: z.number(),
    passedCommands: z.number(),
    results: z.array(z.object({
      command: z.string(),
      exitCode: z.number(),
      stdout: z.string(),
      stderr: z.string(),
      passed: z.boolean(),
      runtimeMs: z.number()
    }))
  }),
  requirements: z.array(ChangeRequirementResultSchema),
  summary: z.object({
    satisfiedCount: z.number(),
    violatedCount: z.number(),
    notVerifiableCount: z.number()
  }),
  runtimeMs: z.number(),
  cleanup: z.object({
    cleanedUp: z.boolean(),
    tempDir: z.string()
  }),
  failureReason: z.string().nullable()
});
export type ChangeRunResult = z.infer<typeof ChangeRunResultSchema>;

export * from "./scorer.js";
export * from "./reporter.js";
export * from "./adapters.js";
export * from "./change-workspace.js";
export * from "./change-agent-adapter.js";
export * from "./change-evaluator.js";
export * from "./live-budget-ledger.js";
