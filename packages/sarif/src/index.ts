import { createHash } from "node:crypto";
import type { AuditReport, ReviewCoverageReport } from "@specbridge/core";

export type SarifLog = { $schema: string; version: "2.1.0"; runs: Array<Record<string, unknown>> };

const level = (severity?: string) =>
  severity === "blocking" || severity === "error" ? "error" : severity === "warning" ? "warning" : "note";

const fingerprint = (value: string) => createHash("sha256").update(value).digest("hex");

export function auditReportToSarif(report: AuditReport, options: { toolName?: string } = {}): SarifLog {
  const rulesMap = new Map<string, Record<string, unknown>>();
  const results: Array<Record<string, unknown>> = [];

  for (const finding of report.findings) {
    if (!rulesMap.has(finding.ruleId)) {
      rulesMap.set(finding.ruleId, {
        id: finding.ruleId,
        name: finding.ruleId,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.description },
        defaultConfiguration: { level: level(finding.severity) },
      });
    }

    const locations = finding.evidence.map((evidence) => ({
      physicalLocation: {
        artifactLocation: { uri: evidence.file, uriBaseId: "SRCROOT" },
        region: { startLine: evidence.line ?? 1 },
      },
    }));

    results.push({
      ruleId: finding.ruleId,
      level: level(finding.severity),
      message: { text: `${finding.title}: ${finding.description}` },
      locations,
      partialFingerprints: {
        "specbridge/v1": fingerprint(finding.id),
      },
      properties: {
        recommendation: finding.recommendation,
        confidence: finding.confidence,
      },
    });
  }

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: options.toolName ?? "SpecBridge",
            rules: Array.from(rulesMap.values()),
          },
        },
        originalUriBaseIds: { SRCROOT: { uri: "file:///" } },
        results,
      },
    ],
  };
}

/** Converts either an AuditReport or legacy ReviewCoverageReport to GitHub Code Scanning compatible SARIF 2.1.0. */
export function toSarif(report: AuditReport | ReviewCoverageReport, options: { toolName?: string } = {}): SarifLog {
  if ("findings" in report) {
    return auditReportToSarif(report, options);
  }

  const rules: Array<Record<string, unknown>> = [];
  const results: Array<Record<string, unknown>> = [];
  for (const requirement of report.requirements) {
    for (const criterion of requirement.criteria) {
      if (criterion.status === "violated") {
        const ruleId = `specbridge/${requirement.requirementId}/${criterion.criterionId}`;
        const sarifLevel = level(requirement.severity);
        rules.push({
          id: ruleId,
          name: criterion.criterionId,
          shortDescription: { text: `Requirement ${requirement.requirementId}` },
          defaultConfiguration: { level: sarifLevel },
        });

        const locations = criterion.evidence.map((evidence) => ({
          physicalLocation: {
            artifactLocation: { uri: evidence.uri ?? evidence.path, uriBaseId: "SRCROOT" },
            region: { startLine: evidence.startLine, ...(evidence.endLine ? { endLine: evidence.endLine } : {}) },
          },
        }));

        results.push({
          ruleId,
          level: sarifLevel,
          message: { text: criterion.explanation },
          locations,
          partialFingerprints: {
            "specbridge/v1": fingerprint(`${ruleId}:${criterion.evidence.map((item) => `${item.path}:${item.startLine}`).join(",")}`),
          },
          properties: {
            requirementId: requirement.requirementId,
            criterionId: criterion.criterionId,
            reviewer: report.reviewer.name,
            confidence: criterion.confidence,
          },
        });
      }
    }
  }

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: { driver: { name: options.toolName ?? "SpecBridge", rules } },
        originalUriBaseIds: { SRCROOT: { uri: report.target.baseUri ?? "file:///" } },
        results,
      },
    ],
  };
}
