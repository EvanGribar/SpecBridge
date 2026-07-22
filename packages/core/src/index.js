import { z } from "zod";
export const SCHEMA_VERSION = "1.0";
const Identifier = z.string().min(1).max(200).regex(/^[A-Za-z0-9._:-]+$/, "must be a stable identifier");
const SafePath = z.string().min(1).max(4096).refine((path) => !path.startsWith("/") && !path.includes("\\") && !path.split("/").includes(".."), "must be a repository-relative path");
const Metadata = z.record(z.unknown()).refine((value) => !Object.prototype.hasOwnProperty.call(value, "__proto__") && !Object.prototype.hasOwnProperty.call(value, "constructor"), "contains unsafe keys");
export const SeveritySchema = z.enum(["blocking", "warning", "informational"]);
export const CoverageStatusSchema = z.enum(["satisfied", "violated", "not_verifiable", "not_applicable"]);
export const SourceLocationSchema = z.object({ type: z.string().min(1), path: SafePath.optional(), uri: z.string().url().optional(), startLine: z.number().int().positive().optional(), endLine: z.number().int().positive().optional() }).superRefine((value, ctx) => { if (value.endLine && value.startLine && value.endLine < value.startLine)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "endLine must not precede startLine" }); if (!value.path && !value.uri)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "path or uri is required" }); });
export const EvidenceLocationSchema = z.object({ path: SafePath, startLine: z.number().int().positive(), endLine: z.number().int().positive().optional(), symbol: z.string().min(1).optional(), explanation: z.string().min(1).optional(), uri: z.string().url().optional() }).superRefine((value, ctx) => { if (value.endLine && value.endLine < value.startLine)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "endLine must not precede startLine" }); });
export const AcceptanceCriterionSchema = z.object({ id: Identifier, description: z.string().min(1), metadata: Metadata.optional() });
export const RequirementSchema = z.object({ id: Identifier, title: z.string().min(1), description: z.string().min(1), severity: SeveritySchema.optional(), criteria: z.array(AcceptanceCriterionSchema).min(1), source: SourceLocationSchema, metadata: Metadata.optional() }).superRefine((value, ctx) => { const ids = new Set(); value.criteria.forEach((criterion, index) => { if (ids.has(criterion.id))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["criteria", index, "id"], message: "duplicate criterion id" }); ids.add(criterion.id); }); });
export const SpecificationSourceSchema = z.object({ type: z.string().min(1), path: SafePath.optional(), uri: z.string().url().optional(), label: z.string().min(1).optional() });
export const RequirementContractSchema = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), id: Identifier, title: z.string().min(1), source: SpecificationSourceSchema, requirements: z.array(RequirementSchema).min(1), metadata: Metadata.optional() }).superRefine((value, ctx) => { const ids = new Set(); value.requirements.forEach((requirement, index) => { if (ids.has(requirement.id))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["requirements", index, "id"], message: "duplicate requirement id" }); ids.add(requirement.id); }); });
export const ReviewTargetSchema = z.object({ repository: z.string().min(1).optional(), commitSha: z.string().min(1).optional(), ref: z.string().min(1).optional(), baseUri: z.string().url().optional() });
export const ReviewerIdentitySchema = z.object({ name: z.string().min(1), version: z.string().min(1).optional() });
export const ExecutionMetadataSchema = z.object({ startedAt: z.string().datetime().optional(), completedAt: z.string().datetime().optional(), runId: z.string().min(1).optional(), metadata: Metadata.optional() });
export const CriterionCoverageSchema = z.object({ criterionId: Identifier, status: CoverageStatusSchema, explanation: z.string().min(1), evidence: z.array(EvidenceLocationSchema), confidence: z.number().min(0).max(1).optional() }).superRefine((value, ctx) => { if (value.status === "violated" && value.evidence.length === 0)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidence"], message: "violated criteria require evidence" }); });
export const RequirementCoverageSchema = z.object({ requirementId: Identifier, criteria: z.array(CriterionCoverageSchema).min(1) });
export const ReviewCoverageReportSchema = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), contractId: Identifier, reviewer: ReviewerIdentitySchema, target: ReviewTargetSchema, execution: ExecutionMetadataSchema.optional(), requirements: z.array(RequirementCoverageSchema).min(1), metadata: Metadata.optional() });
export class SpecBridgeValidationError extends Error {
    issues;
    constructor(message, issues) {
        super(message);
        this.issues = issues;
        this.name = "SpecBridgeValidationError";
    }
}
export function parseContract(input) { const parsed = RequirementContractSchema.safeParse(input); if (!parsed.success)
    throw new SpecBridgeValidationError("Invalid requirement contract", parsed.error.issues); return parsed.data; }
export function parseCoverageReport(input) { const parsed = ReviewCoverageReportSchema.safeParse(input); if (!parsed.success)
    throw new SpecBridgeValidationError("Invalid coverage report", parsed.error.issues); return parsed.data; }
//# sourceMappingURL=index.js.map