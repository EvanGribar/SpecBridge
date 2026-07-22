import { z } from "zod";
export declare const SCHEMA_VERSION: "1.0";
export declare const SeveritySchema: z.ZodEnum<["blocking", "warning", "informational"]>;
export declare const CoverageStatusSchema: z.ZodEnum<["satisfied", "violated", "not_verifiable", "not_applicable"]>;
export declare const SourceLocationSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodString;
    path: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    uri: z.ZodOptional<z.ZodString>;
    startLine: z.ZodOptional<z.ZodNumber>;
    endLine: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: string;
    path?: string | undefined;
    uri?: string | undefined;
    startLine?: number | undefined;
    endLine?: number | undefined;
}, {
    type: string;
    path?: string | undefined;
    uri?: string | undefined;
    startLine?: number | undefined;
    endLine?: number | undefined;
}>, {
    type: string;
    path?: string | undefined;
    uri?: string | undefined;
    startLine?: number | undefined;
    endLine?: number | undefined;
}, {
    type: string;
    path?: string | undefined;
    uri?: string | undefined;
    startLine?: number | undefined;
    endLine?: number | undefined;
}>;
export declare const EvidenceLocationSchema: z.ZodEffects<z.ZodObject<{
    path: z.ZodEffects<z.ZodString, string, string>;
    startLine: z.ZodNumber;
    endLine: z.ZodOptional<z.ZodNumber>;
    symbol: z.ZodOptional<z.ZodString>;
    explanation: z.ZodOptional<z.ZodString>;
    uri: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    startLine: number;
    symbol?: string | undefined;
    uri?: string | undefined;
    endLine?: number | undefined;
    explanation?: string | undefined;
}, {
    path: string;
    startLine: number;
    symbol?: string | undefined;
    uri?: string | undefined;
    endLine?: number | undefined;
    explanation?: string | undefined;
}>, {
    path: string;
    startLine: number;
    symbol?: string | undefined;
    uri?: string | undefined;
    endLine?: number | undefined;
    explanation?: string | undefined;
}, {
    path: string;
    startLine: number;
    symbol?: string | undefined;
    uri?: string | undefined;
    endLine?: number | undefined;
    explanation?: string | undefined;
}>;
export declare const AcceptanceCriterionSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    description: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const RequirementSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    severity: z.ZodOptional<z.ZodEnum<["blocking", "warning", "informational"]>>;
    criteria: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        metadata?: Record<string, unknown> | undefined;
    }, {
        id: string;
        description: string;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
    source: z.ZodEffects<z.ZodObject<{
        type: z.ZodString;
        path: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        uri: z.ZodOptional<z.ZodString>;
        startLine: z.ZodOptional<z.ZodNumber>;
        endLine: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    }, {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    }>, {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    }, {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    }>;
    metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    title: string;
    criteria: {
        id: string;
        description: string;
        metadata?: Record<string, unknown> | undefined;
    }[];
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    };
    metadata?: Record<string, unknown> | undefined;
    severity?: "blocking" | "warning" | "informational" | undefined;
}, {
    id: string;
    description: string;
    title: string;
    criteria: {
        id: string;
        description: string;
        metadata?: Record<string, unknown> | undefined;
    }[];
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    };
    metadata?: Record<string, unknown> | undefined;
    severity?: "blocking" | "warning" | "informational" | undefined;
}>, {
    id: string;
    description: string;
    title: string;
    criteria: {
        id: string;
        description: string;
        metadata?: Record<string, unknown> | undefined;
    }[];
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    };
    metadata?: Record<string, unknown> | undefined;
    severity?: "blocking" | "warning" | "informational" | undefined;
}, {
    id: string;
    description: string;
    title: string;
    criteria: {
        id: string;
        description: string;
        metadata?: Record<string, unknown> | undefined;
    }[];
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        startLine?: number | undefined;
        endLine?: number | undefined;
    };
    metadata?: Record<string, unknown> | undefined;
    severity?: "blocking" | "warning" | "informational" | undefined;
}>;
export declare const SpecificationSourceSchema: z.ZodObject<{
    type: z.ZodString;
    path: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    uri: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    path?: string | undefined;
    uri?: string | undefined;
    label?: string | undefined;
}, {
    type: string;
    path?: string | undefined;
    uri?: string | undefined;
    label?: string | undefined;
}>;
export declare const RequirementContractSchema: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    id: z.ZodString;
    title: z.ZodString;
    source: z.ZodObject<{
        type: z.ZodString;
        path: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        uri: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        label?: string | undefined;
    }, {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        label?: string | undefined;
    }>;
    requirements: z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<["blocking", "warning", "informational"]>>;
        criteria: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            description: z.ZodString;
            metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }, {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }>, "many">;
        source: z.ZodEffects<z.ZodObject<{
            type: z.ZodString;
            path: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            uri: z.ZodOptional<z.ZodString>;
            startLine: z.ZodOptional<z.ZodNumber>;
            endLine: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        }, {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        }>, {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        }, {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        }>;
        metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }, {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }>, {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }, {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }>, "many">;
    metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        label?: string | undefined;
    };
    schemaVersion: "1.0";
    requirements: {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    title: string;
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        label?: string | undefined;
    };
    schemaVersion: "1.0";
    requirements: {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
}>, {
    id: string;
    title: string;
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        label?: string | undefined;
    };
    schemaVersion: "1.0";
    requirements: {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    title: string;
    source: {
        type: string;
        path?: string | undefined;
        uri?: string | undefined;
        label?: string | undefined;
    };
    schemaVersion: "1.0";
    requirements: {
        id: string;
        description: string;
        title: string;
        criteria: {
            id: string;
            description: string;
            metadata?: Record<string, unknown> | undefined;
        }[];
        source: {
            type: string;
            path?: string | undefined;
            uri?: string | undefined;
            startLine?: number | undefined;
            endLine?: number | undefined;
        };
        metadata?: Record<string, unknown> | undefined;
        severity?: "blocking" | "warning" | "informational" | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const ReviewTargetSchema: z.ZodObject<{
    repository: z.ZodOptional<z.ZodString>;
    commitSha: z.ZodOptional<z.ZodString>;
    ref: z.ZodOptional<z.ZodString>;
    baseUri: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    repository?: string | undefined;
    commitSha?: string | undefined;
    ref?: string | undefined;
    baseUri?: string | undefined;
}, {
    repository?: string | undefined;
    commitSha?: string | undefined;
    ref?: string | undefined;
    baseUri?: string | undefined;
}>;
export declare const ReviewerIdentitySchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version?: string | undefined;
}, {
    name: string;
    version?: string | undefined;
}>;
export declare const ExecutionMetadataSchema: z.ZodObject<{
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, unknown> | undefined;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    runId?: string | undefined;
}, {
    metadata?: Record<string, unknown> | undefined;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    runId?: string | undefined;
}>;
export declare const CriterionCoverageSchema: z.ZodEffects<z.ZodObject<{
    criterionId: z.ZodString;
    status: z.ZodEnum<["satisfied", "violated", "not_verifiable", "not_applicable"]>;
    explanation: z.ZodString;
    evidence: z.ZodArray<z.ZodEffects<z.ZodObject<{
        path: z.ZodEffects<z.ZodString, string, string>;
        startLine: z.ZodNumber;
        endLine: z.ZodOptional<z.ZodNumber>;
        symbol: z.ZodOptional<z.ZodString>;
        explanation: z.ZodOptional<z.ZodString>;
        uri: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }, {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }>, {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }, {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }>, "many">;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
    explanation: string;
    criterionId: string;
    evidence: {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }[];
    confidence?: number | undefined;
}, {
    status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
    explanation: string;
    criterionId: string;
    evidence: {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }[];
    confidence?: number | undefined;
}>, {
    status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
    explanation: string;
    criterionId: string;
    evidence: {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }[];
    confidence?: number | undefined;
}, {
    status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
    explanation: string;
    criterionId: string;
    evidence: {
        path: string;
        startLine: number;
        symbol?: string | undefined;
        uri?: string | undefined;
        endLine?: number | undefined;
        explanation?: string | undefined;
    }[];
    confidence?: number | undefined;
}>;
export declare const RequirementCoverageSchema: z.ZodObject<{
    requirementId: z.ZodString;
    criteria: z.ZodArray<z.ZodEffects<z.ZodObject<{
        criterionId: z.ZodString;
        status: z.ZodEnum<["satisfied", "violated", "not_verifiable", "not_applicable"]>;
        explanation: z.ZodString;
        evidence: z.ZodArray<z.ZodEffects<z.ZodObject<{
            path: z.ZodEffects<z.ZodString, string, string>;
            startLine: z.ZodNumber;
            endLine: z.ZodOptional<z.ZodNumber>;
            symbol: z.ZodOptional<z.ZodString>;
            explanation: z.ZodOptional<z.ZodString>;
            uri: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }, {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }>, {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }, {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }>, "many">;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
        explanation: string;
        criterionId: string;
        evidence: {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }[];
        confidence?: number | undefined;
    }, {
        status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
        explanation: string;
        criterionId: string;
        evidence: {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }[];
        confidence?: number | undefined;
    }>, {
        status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
        explanation: string;
        criterionId: string;
        evidence: {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }[];
        confidence?: number | undefined;
    }, {
        status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
        explanation: string;
        criterionId: string;
        evidence: {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }[];
        confidence?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    criteria: {
        status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
        explanation: string;
        criterionId: string;
        evidence: {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }[];
        confidence?: number | undefined;
    }[];
    requirementId: string;
}, {
    criteria: {
        status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
        explanation: string;
        criterionId: string;
        evidence: {
            path: string;
            startLine: number;
            symbol?: string | undefined;
            uri?: string | undefined;
            endLine?: number | undefined;
            explanation?: string | undefined;
        }[];
        confidence?: number | undefined;
    }[];
    requirementId: string;
}>;
export declare const ReviewCoverageReportSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    contractId: z.ZodString;
    reviewer: z.ZodObject<{
        name: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        version?: string | undefined;
    }, {
        name: string;
        version?: string | undefined;
    }>;
    target: z.ZodObject<{
        repository: z.ZodOptional<z.ZodString>;
        commitSha: z.ZodOptional<z.ZodString>;
        ref: z.ZodOptional<z.ZodString>;
        baseUri: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        repository?: string | undefined;
        commitSha?: string | undefined;
        ref?: string | undefined;
        baseUri?: string | undefined;
    }, {
        repository?: string | undefined;
        commitSha?: string | undefined;
        ref?: string | undefined;
        baseUri?: string | undefined;
    }>;
    execution: z.ZodOptional<z.ZodObject<{
        startedAt: z.ZodOptional<z.ZodString>;
        completedAt: z.ZodOptional<z.ZodString>;
        runId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
    }, "strip", z.ZodTypeAny, {
        metadata?: Record<string, unknown> | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        runId?: string | undefined;
    }, {
        metadata?: Record<string, unknown> | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        runId?: string | undefined;
    }>>;
    requirements: z.ZodArray<z.ZodObject<{
        requirementId: z.ZodString;
        criteria: z.ZodArray<z.ZodEffects<z.ZodObject<{
            criterionId: z.ZodString;
            status: z.ZodEnum<["satisfied", "violated", "not_verifiable", "not_applicable"]>;
            explanation: z.ZodString;
            evidence: z.ZodArray<z.ZodEffects<z.ZodObject<{
                path: z.ZodEffects<z.ZodString, string, string>;
                startLine: z.ZodNumber;
                endLine: z.ZodOptional<z.ZodNumber>;
                symbol: z.ZodOptional<z.ZodString>;
                explanation: z.ZodOptional<z.ZodString>;
                uri: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }, {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }>, {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }, {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }>, "many">;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }, {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }>, {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }, {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        criteria: {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }[];
        requirementId: string;
    }, {
        criteria: {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }[];
        requirementId: string;
    }>, "many">;
    metadata: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: "1.0";
    requirements: {
        criteria: {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }[];
        requirementId: string;
    }[];
    contractId: string;
    reviewer: {
        name: string;
        version?: string | undefined;
    };
    target: {
        repository?: string | undefined;
        commitSha?: string | undefined;
        ref?: string | undefined;
        baseUri?: string | undefined;
    };
    metadata?: Record<string, unknown> | undefined;
    execution?: {
        metadata?: Record<string, unknown> | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        runId?: string | undefined;
    } | undefined;
}, {
    schemaVersion: "1.0";
    requirements: {
        criteria: {
            status: "satisfied" | "violated" | "not_verifiable" | "not_applicable";
            explanation: string;
            criterionId: string;
            evidence: {
                path: string;
                startLine: number;
                symbol?: string | undefined;
                uri?: string | undefined;
                endLine?: number | undefined;
                explanation?: string | undefined;
            }[];
            confidence?: number | undefined;
        }[];
        requirementId: string;
    }[];
    contractId: string;
    reviewer: {
        name: string;
        version?: string | undefined;
    };
    target: {
        repository?: string | undefined;
        commitSha?: string | undefined;
        ref?: string | undefined;
        baseUri?: string | undefined;
    };
    metadata?: Record<string, unknown> | undefined;
    execution?: {
        metadata?: Record<string, unknown> | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        runId?: string | undefined;
    } | undefined;
}>;
export type RequirementContract = z.infer<typeof RequirementContractSchema>;
export type ReviewCoverageReport = z.infer<typeof ReviewCoverageReportSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type CriterionCoverage = z.infer<typeof CriterionCoverageSchema>;
export type EvidenceLocation = z.infer<typeof EvidenceLocationSchema>;
export type CoverageStatus = z.infer<typeof CoverageStatusSchema>;
export declare class SpecBridgeValidationError extends Error {
    readonly issues: z.ZodIssue[];
    constructor(message: string, issues: z.ZodIssue[]);
}
export declare function parseContract(input: unknown): RequirementContract;
export declare function parseCoverageReport(input: unknown): ReviewCoverageReport;
//# sourceMappingURL=index.d.ts.map