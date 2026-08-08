import { readFileSync } from "node:fs";
import { parseCoverageReport, type ReviewCoverageReport } from "@specbridge/core";
import { NormalizedFindingSchema, type NormalizedFinding, type ReviewInput, type ReviewOutput, type ReviewerAdapter } from "./index.js";

export function normalizeFindings(input: unknown[]): NormalizedFinding[] {
  return input.map((finding) => NormalizedFindingSchema.parse(finding));
}

export class JsonFileAdapter implements ReviewerAdapter {
  name = "json-file";
  version?: string;

  constructor(private readonly resultFile: string) {}

  async review(input: ReviewInput): Promise<ReviewOutput> {
    const source = JSON.parse(readFileSync(this.resultFile, "utf8"));
    const selected = source.cases?.[input.case.id] ?? source;
    return {
      findings: normalizeFindings(selected.findings ?? selected),
      raw: selected,
      runtimeMs: selected.runtimeMs ?? source.runtimeMs,
      estimatedCostUsd: selected.estimatedCostUsd ?? source.estimatedCostUsd,
      metadata: { source: this.resultFile },
    };
  }
}

/** Offline ingestion for the documented Swarm Review export format. */
export class SwarmReviewAdapter implements ReviewerAdapter {
  name = "swarm-review";

  constructor(private readonly resultFile: string, public version?: string) {}

  async review(input: ReviewInput): Promise<ReviewOutput> {
    const source = JSON.parse(readFileSync(this.resultFile, "utf8"));
    const selected = source.cases?.[input.case.id] ?? source;
    const findings = selected.findings ?? selected.issues ?? [];
    return {
      findings: normalizeFindings(
        findings.map((item: Record<string, unknown>) => ({
          title: item.title ?? item.message ?? "Untitled finding",
          description: item.description ?? item.body ?? "No description supplied",
          severity: item.severity,
          file: item.file ?? item.path,
          startLine: item.startLine ?? item.line,
          endLine: item.endLine,
          confidence: item.confidence,
          requirementReference: item.requirementReference,
        })),
      ),
      raw: selected,
      runtimeMs: selected.runtimeMs ?? source.runtimeMs,
      estimatedCostUsd: selected.estimatedCostUsd ?? source.estimatedCostUsd,
      metadata: { source: this.resultFile, caseId: input.case.id },
    };
  }
}

/** Native, offline ingestion of the authoritative SpecBridge coverage artifact. */
export class SpecBridgeAdapter implements ReviewerAdapter {
  name = "specbridge";
  version?: string;

  constructor(private readonly resultFile: string) {}

  async review(input: ReviewInput): Promise<ReviewOutput> {
    let source: unknown;
    try {
      source = JSON.parse(readFileSync(this.resultFile, "utf8"));
    } catch (error) {
      throw new Error(`Invalid SpecBridge coverage JSON at ${this.resultFile}: ${error instanceof Error ? error.message : String(error)}`);
    }

    let coverage: ReviewCoverageReport;
    try {
      coverage = parseCoverageReport(source);
    } catch (error) {
      throw new Error(`Invalid SpecBridge coverage artifact: ${error instanceof Error ? error.message : String(error)}`);
    }

    const seen = new Set<string>();
    const criterionResults = coverage.requirements.flatMap((requirement) =>
      requirement.criteria.map((criterion) => {
        const key = `${requirement.requirementId}:${criterion.criterionId}`;
        if (seen.has(key)) throw new Error(`Duplicate SpecBridge criterion result: ${key}`);
        seen.add(key);
        return {
          requirementId: requirement.requirementId,
          criterionId: criterion.criterionId,
          status: criterion.status,
          explanation: criterion.explanation,
          confidence: criterion.confidence,
          evidence: criterion.evidence.map((item) => ({
            path: item.path,
            startLine: item.startLine,
            ...(item.endLine ? { endLine: item.endLine } : {}),
            ...(item.uri ? { uri: item.uri } : {}),
          })),
        };
      }),
    );

    const findings = criterionResults
      .filter((criterion) => criterion.status === "violated")
      .flatMap((criterion) =>
        criterion.evidence.map((evidence, index) =>
          NormalizedFindingSchema.parse({
            id: `${criterion.requirementId}:${criterion.criterionId}:${index}`,
            title: criterion.criterionId,
            description: criterion.explanation,
            file: evidence.path,
            startLine: evidence.startLine,
            endLine: evidence.endLine,
            confidence: criterion.confidence,
            requirementReference: criterion.requirementId,
          }),
        ),
      );

    const execution = coverage.execution?.metadata ?? {};
    const runtimeMs = typeof execution.durationMs === "number" ? execution.durationMs : undefined;
    const estimatedCostUsd = typeof execution.estimatedCostUsd === "number" ? execution.estimatedCostUsd : undefined;
    this.version = coverage.reviewer.version;
    return {
      findings,
      criterionResults,
      raw: coverage,
      runtimeMs,
      estimatedCostUsd,
      metadata: {
        source: this.resultFile,
        caseId: input.case.id,
        specBridgeSchemaVersion: coverage.schemaVersion,
        contractId: coverage.contractId,
        reviewer: coverage.reviewer,
        target: coverage.target,
        execution: coverage.execution,
        provenance: coverage.metadata ?? {},
        statusCounts: Object.fromEntries(
          ["satisfied", "violated", "not_verifiable", "not_applicable"].map((status) => [
            status,
            criterionResults.filter((item) => item.status === status).length,
          ]),
        ),
      },
    };
  }
}

export * from "./change-workspace.js";
export * from "./change-agent-adapter.js";
export * from "./change-evaluator.js";
