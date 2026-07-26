import {
  type AuditConfig,
  type AuditFinding,
  type AuditReport,
  type AuditSeverity,
  calculateGuidanceScore,
  SCHEMA_VERSION,
} from "@specbridge/core";
import { type ParsedInstructionFile } from "@specbridge/parsers";
import { type RepositoryInventory } from "@specbridge/repository";

export interface AuditRule {
  id: string;
  name: string;
  defaultSeverity: AuditSeverity;
  description: string;
  run(inventory: RepositoryInventory): AuditFinding[];
}

// 1. missing-path & 11. invalid-path-escape & 8. stale-reference
export const pathReferenceRule: AuditRule = {
  id: "missing-path",
  name: "Missing Path Reference",
  defaultSeverity: "error",
  description: "Referenced file or directory does not exist or escapes repository bounds.",
  run(inventory) {
    const findings: AuditFinding[] = [];

    for (const inst of inventory.instructionFiles) {
      for (const ref of inst.referencedPaths) {
        if (ref.isEscape) {
          findings.push({
            id: `invalid-path-escape:${inst.path}:${ref.line}`,
            ruleId: "invalid-path-escape",
            severity: "error",
            title: "Invalid path escape",
            description: `Guidance contains path '${ref.path}' that escapes repository bounds or points outside root.`,
            evidence: [{ file: inst.path, line: ref.line, excerpt: ref.rawText }],
            recommendation: "Use repository-relative paths without leading '/' or '..'.",
            confidence: "deterministic",
          });
          continue;
        }

        const pathClean = ref.path;
        // Ignore single-segment terms or extensionless keywords that might not be paths
        if (!pathClean.includes("/") && !pathClean.includes(".")) continue;

        const existsFile = inventory.files.has(pathClean);
        const existsDir = inventory.directories.has(pathClean) || Array.from(inventory.files).some((f) => f.startsWith(`${pathClean}/`));

        if (!existsFile && !existsDir) {
          const isStale = pathClean.includes("archive") || pathClean.includes("old") || pathClean.includes("deprecated");
          const ruleId = isStale ? "stale-reference" : "missing-path";
          findings.push({
            id: `${ruleId}:${inst.path}:${ref.line}:${pathClean}`,
            ruleId,
            severity: "error",
            title: isStale ? "Stale path reference" : "Referenced file or directory does not exist",
            description: `Instruction file references '${pathClean}', but that file or directory does not exist in the repository.`,
            evidence: [{ file: inst.path, line: ref.line, excerpt: ref.rawText }],
            recommendation: "Remove or update stale path references to point to existing files or directories.",
            confidence: "deterministic",
          });
        }
      }
    }

    return findings;
  },
};

// 2. missing-script & 8. stale-reference
export const missingScriptRule: AuditRule = {
  id: "missing-script",
  name: "Missing Package Script",
  defaultSeverity: "error",
  description: "Referenced package script does not exist in package manifests.",
  run(inventory) {
    const findings: AuditFinding[] = [];
    if (inventory.packageScripts.size === 0) return findings;

    for (const inst of inventory.instructionFiles) {
      for (const cmd of inst.referencedCommands) {
        if (!cmd.scriptName) continue;
        // Built-in scripts or commands that aren't package.json scripts
        if (["test", "start", "build", "lint", "typecheck", "ci", "exec", "run"].includes(cmd.scriptName) && !inventory.packageScripts.has(cmd.scriptName)) {
          // npm test, pnpm test, etc. can be standard npm targets if defined, but if missing:
        }

        const scriptName = cmd.scriptName;
        // If scriptName looks like a script invocation (not a flags or sub-args)
        if (/^[a-zA-Z0-9_-]+$/.test(scriptName)) {
          const knownStandard = ["install", "i", "add", "remove", "exec", "dlx", "create", "init", "node", "tsx", "vitest", "tsc", "eslint", "prettier"];
          if (knownStandard.includes(scriptName)) continue;

          if (!inventory.packageScripts.has(scriptName)) {
            findings.push({
              id: `missing-script:${inst.path}:${cmd.line}:${scriptName}`,
              ruleId: "missing-script",
              severity: "error",
              title: "Referenced package script does not exist",
              description: `Instruction '${cmd.fullCommand}' references script '${scriptName}', but '${scriptName}' is not defined in package.json.`,
              evidence: [{ file: inst.path, line: cmd.line, excerpt: cmd.rawText }],
              recommendation: `Add '${scriptName}' script to package.json or update instruction file.`,
              confidence: "deterministic",
            });
          }
        }
      }
    }

    return findings;
  },
};

// 3. package-manager-conflict
export const packageManagerConflictRule: AuditRule = {
  id: "package-manager-conflict",
  name: "Package Manager Conflict",
  defaultSeverity: "error",
  description: "Instruction specifies a package manager that conflicts with repository setup.",
  run(inventory) {
    const findings: AuditFinding[] = [];
    const repoPm = inventory.packageManager.name;

    for (const inst of inventory.instructionFiles) {
      for (const cmd of inst.referencedCommands) {
        if (cmd.packageManager && cmd.packageManager !== repoPm) {
          // Exception: npx/npm dlx when repo uses pnpm is often acceptable, but direct `npm test` when repo uses `pnpm` is an error
          findings.push({
            id: `package-manager-conflict:${inst.path}:${cmd.line}`,
            ruleId: "package-manager-conflict",
            severity: "error",
            title: "Wrong package manager specified",
            description: `Instruction tells agents to run '${cmd.fullCommand}' using ${cmd.packageManager}, but the repository uses ${repoPm}.`,
            evidence: [{ file: inst.path, line: cmd.line, excerpt: cmd.rawText }],
            recommendation: `Update instructions to use ${repoPm} instead of ${cmd.packageManager}.`,
            confidence: "deterministic",
          });
        }
      }
    }

    return findings;
  },
};

// 4. runtime-conflict
export const runtimeConflictRule: AuditRule = {
  id: "runtime-conflict",
  name: "Runtime Version Conflict",
  defaultSeverity: "error",
  description: "Instruction specifies a Node/runtime version that conflicts with repository configuration.",
  run(inventory) {
    const findings: AuditFinding[] = [];
    if (!inventory.nodeEngineRequirement) return findings;

    const repoReq = inventory.nodeEngineRequirement;

    for (const inst of inventory.instructionFiles) {
      for (const req of inst.nodeVersionRequirements) {
        if (!req.parsedVersion) continue;

        const instVer = parseInt(req.parsedVersion, 10);

        // Simple version comparison logic: e.g. instVer = 20 while repoReq says >=24 or 24
        if (repoReq.raw.includes(">=24") && instVer < 24) {
          findings.push({
            id: `runtime-conflict:${inst.path}:${req.line}`,
            ruleId: "runtime-conflict",
            severity: "error",
            title: "Node or runtime version conflict",
            description: `${inst.path} requires Node.js ${req.raw}, but ${repoReq.sourceFile} requires Node.js ${repoReq.raw}.`,
            evidence: [{ file: inst.path, line: req.line, excerpt: req.raw }],
            recommendation: `Align Node.js requirements across instructions and ${repoReq.sourceFile}.`,
            confidence: "deterministic",
          });
        } else if (repoReq.raw.includes("24") && instVer === 20) {
          findings.push({
            id: `runtime-conflict:${inst.path}:${req.line}`,
            ruleId: "runtime-conflict",
            severity: "error",
            title: "Node or runtime version conflict",
            description: `${inst.path} requires Node.js ${req.raw}, but ${repoReq.sourceFile} requires Node.js ${repoReq.raw}.`,
            evidence: [{ file: inst.path, line: req.line, excerpt: req.raw }],
            recommendation: `Align Node.js requirements across instructions and ${repoReq.sourceFile}.`,
            confidence: "deterministic",
          });
        }
      }
    }

    return findings;
  },
};

// 5. empty-scope
export const emptyScopeRule: AuditRule = {
  id: "empty-scope",
  name: "Empty Scope Glob",
  defaultSeverity: "warning",
  description: "A scoped instruction glob matches zero files in the repository.",
  run(inventory) {
    const findings: AuditFinding[] = [];

    for (const inst of inventory.instructionFiles) {
      if (!inst.applyToGlobs || inst.applyToGlobs.length === 0) continue;

      for (const glob of inst.applyToGlobs) {
        // Simple prefix or suffix matching for globs
        const basePrefix = glob.replace(/\/\*\*?.*$/, "").replace(/\/\*.*$/, "");

        const hasMatch = Array.from(inventory.files).some((f) => f.startsWith(basePrefix) || f.includes(basePrefix)) ||
          Array.from(inventory.directories).some((d) => d === basePrefix || d.startsWith(basePrefix));

        if (!hasMatch) {
          findings.push({
            id: `empty-scope:${inst.path}:${glob}`,
            ruleId: "empty-scope",
            severity: "warning",
            title: "Scoped instruction glob matches no files",
            description: `Instruction glob '${glob}' in ${inst.path} matches no files or directories in the repository.`,
            evidence: [{ file: inst.path, line: 1, excerpt: `applyTo: ${glob}` }],
            recommendation: "Remove or correct the scoped glob filter.",
            confidence: "deterministic",
          });
        }
      }
    }

    return findings;
  },
};

// 6. contradictory-guidance & 10. command-conflict
export const commandConflictRule: AuditRule = {
  id: "command-conflict",
  name: "Conflicting Agent Commands",
  defaultSeverity: "warning",
  description: "Multiple agent instruction files give conflicting commands for the same operation.",
  run(inventory) {
    const findings: AuditFinding[] = [];

    // Group test/migrate/build commands across files
    const cmdsByCategory = new Map<string, Array<{ inst: ParsedInstructionFile; cmd: ParsedInstructionFile["referencedCommands"][number] }>>();

    for (const inst of inventory.instructionFiles) {
      for (const cmd of inst.referencedCommands) {
        if (!cmd.category || cmd.category === "other") continue;
        const key = cmd.category;
        const list = cmdsByCategory.get(key) ?? [];
        list.push({ inst, cmd });
        cmdsByCategory.set(key, list);
      }
    }

    for (const [category, entries] of cmdsByCategory.entries()) {
      if (entries.length < 2) continue;
      const first = entries[0]!;

      for (let i = 1; i < entries.length; i++) {
        const current = entries[i]!;
        // If files are different and commands differ significantly
        if (first.inst.path !== current.inst.path && first.cmd.fullCommand !== current.cmd.fullCommand) {
          const isNestedContradiction = first.inst.path.includes("/") !== current.inst.path.includes("/");
          const ruleId = isNestedContradiction ? "contradictory-guidance" : "command-conflict";
          const title = isNestedContradiction ? "Nested guidance contradicts root guidance" : "Conflicting commands for the same operation";

          findings.push({
            id: `${ruleId}:${current.inst.path}:${current.cmd.line}`,
            ruleId,
            severity: "warning",
            title,
            description: `${current.inst.path} specifies '${current.cmd.fullCommand}' for ${category}, which conflicts with '${first.cmd.fullCommand}' in ${first.inst.path}.`,
            evidence: [
              { file: first.inst.path, line: first.cmd.line, excerpt: first.cmd.rawText },
              { file: current.inst.path, line: current.cmd.line, excerpt: current.cmd.rawText },
            ],
            recommendation: "Standardize commands across root and nested instruction files.",
            confidence: "deterministic",
          });
        }
      }
    }

    return findings;
  },
};

// 7. duplicate-guidance
export const duplicateGuidanceRule: AuditRule = {
  id: "duplicate-guidance",
  name: "Duplicate Guidance",
  defaultSeverity: "warning",
  description: "The same instruction appears in multiple files with inconsistent or duplicated wording.",
  run(inventory) {
    const findings: AuditFinding[] = [];
    const seenSentences = new Map<string, { file: string; line: number; text: string }>();

    for (const inst of inventory.instructionFiles) {
      const lines = inst.rawContent.split(/\r?\n/);
      lines.forEach((lineText, idx) => {
        const trimmed = lineText.trim().replace(/^[-*#]\s*/, "");
        if (trimmed.length < 25) return; // skip short lines

        const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (seenSentences.has(normalized)) {
          const prev = seenSentences.get(normalized)!;
          if (prev.file !== inst.path) {
            findings.push({
              id: `duplicate-guidance:${inst.path}:${idx + 1}`,
              ruleId: "duplicate-guidance",
              severity: "warning",
              title: "Duplicate instruction across files",
              description: `The same instruction appears in both ${prev.file} and ${inst.path}.`,
              evidence: [
                { file: prev.file, line: prev.line, excerpt: prev.text },
                { file: inst.path, line: idx + 1, excerpt: trimmed },
              ],
              recommendation: "Consolidate duplicate instructions into a single shared file.",
              confidence: "deterministic",
            });
          }
        } else {
          seenSentences.set(normalized, { file: inst.path, line: idx + 1, text: trimmed });
        }
      });
    }

    return findings;
  },
};

// 9. ci-command-mismatch
export const ciCommandMismatchRule: AuditRule = {
  id: "ci-command-mismatch",
  name: "CI Validation Command Mismatch",
  defaultSeverity: "error",
  description: "CI workflows and instruction files specify inconsistent validation commands.",
  run(inventory) {
    const findings: AuditFinding[] = [];
    if (inventory.ciWorkflows.length === 0) return findings;

    for (const inst of inventory.instructionFiles) {
      for (const cmd of inst.referencedCommands) {
        if (!cmd.category || (cmd.category !== "test" && cmd.category !== "lint" && cmd.category !== "typecheck")) continue;

        for (const ciStep of inventory.ciWorkflows) {
          const ciCmdClean = ciStep.command.trim();
          const instCmdClean = cmd.fullCommand.trim();

          if (ciCmdClean.includes(cmd.category) || (cmd.category === "test" && ciCmdClean.includes("test"))) {
            if (ciCmdClean !== instCmdClean) {
              findings.push({
                id: `ci-command-mismatch:${inst.path}:${cmd.line}:${ciStep.workflowFile}`,
                ruleId: "ci-command-mismatch",
                severity: "error",
                title: "CI workflows and instruction files specify inconsistent validation commands",
                description: `${inst.path} instructs agents to run '${instCmdClean}', but CI workflow (${ciStep.workflowFile}) executes '${ciCmdClean}'.`,
                evidence: [
                  { file: inst.path, line: cmd.line, excerpt: cmd.rawText },
                  { file: ciStep.workflowFile, line: ciStep.line, excerpt: ciStep.command },
                ],
                recommendation: "Ensure instruction files instruct agents to run the exact commands executed in CI.",
                confidence: "deterministic",
              });
            }
          }
        }
      }
    }

    return findings;
  },
};

// 12. malformed-metadata
export const malformedMetadataRule: AuditRule = {
  id: "malformed-metadata",
  name: "Malformed Instruction Metadata",
  defaultSeverity: "error",
  description: "Unsupported or malformed instruction metadata is present.",
  run(inventory) {
    const findings: AuditFinding[] = [];

    for (const inst of inventory.instructionFiles) {
      if (inst.malformedFrontmatter) {
        findings.push({
          id: `malformed-metadata:${inst.path}:1`,
          ruleId: "malformed-metadata",
          severity: "error",
          title: "Malformed YAML frontmatter",
          description: `${inst.path} contains invalid or unclosed YAML frontmatter metadata.`,
          evidence: [{ file: inst.path, line: 1 }],
          recommendation: "Fix YAML frontmatter syntax delimiters ('---').",
          confidence: "deterministic",
        });
      }
    }

    return findings;
  },
};

// 13. sensitive-path warning
export const sensitivePathRule: AuditRule = {
  id: "uncovered-sensitive-path",
  name: "Uncovered Sensitive Path",
  defaultSeverity: "warning",
  description: "Sensitive directory contains payment or security code but has no scoped guidance file.",
  run(inventory) {
    const findings: AuditFinding[] = [];
    const sensitiveDirs = inventory.config?.sensitive_paths ?? ["src/billing", "src/auth", "migrations"];

    for (const sDir of sensitiveDirs) {
      const cleanDir = sDir.replace(/\/\*\*?$/, "");
      const existsDir = inventory.directories.has(cleanDir) || Array.from(inventory.files).some((f) => f.startsWith(`${cleanDir}/`));

      if (existsDir) {
        const hasScopedGuidance = inventory.instructionFiles.some((inst) => inst.path.startsWith(`${cleanDir}/`) || inst.applyToGlobs?.some((g) => g.includes(cleanDir)));

        if (!hasScopedGuidance) {
          findings.push({
            id: `uncovered-sensitive-path:${cleanDir}`,
            ruleId: "uncovered-sensitive-path",
            severity: "warning",
            title: "Sensitive path has no scoped guidance",
            description: `${cleanDir} contains sensitive code but has no dedicated AGENTS.md or scoped instruction file.`,
            evidence: [{ file: cleanDir }],
            recommendation: `Add a scoped AGENTS.md in ${cleanDir} to guide AI coding agents.`,
            confidence: "deterministic",
          });
        }
      }
    }

    return findings;
  },
};

export const ALL_RULES: AuditRule[] = [
  pathReferenceRule,
  missingScriptRule,
  packageManagerConflictRule,
  runtimeConflictRule,
  emptyScopeRule,
  commandConflictRule,
  duplicateGuidanceRule,
  ciCommandMismatchRule,
  malformedMetadataRule,
  sensitivePathRule,
];

export function runAudit(inventory: RepositoryInventory, customConfig?: AuditConfig): AuditReport {
  const config = customConfig ?? inventory.config;

  let rawFindings: AuditFinding[] = [];
  for (const rule of ALL_RULES) {
    const ruleFindings = rule.run(inventory);
    rawFindings.push(...ruleFindings);
  }

  // Deduplicate findings by ID
  const seenIds = new Set<string>();
  const uniqueFindings: AuditFinding[] = [];
  for (const f of rawFindings) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      uniqueFindings.push(f);
    }
  }

  // Filter & override severity based on config
  let finalFindings = uniqueFindings.filter((f) => {
    const configuredSev = config?.severity?.[f.ruleId];
    if (configuredSev === "ignore") return false;
    if (configuredSev && configuredSev !== f.severity) {
      f.severity = configuredSev as AuditSeverity;
    }

    // Configured ignore patterns
    if (config?.ignore) {
      const isIgnored = f.evidence.some((ev) => config.ignore!.some((pat) => ev.file.includes(pat.replace(/\/\*\*?$/, ""))));
      if (isIgnored) return false;
    }

    return true;
  });

  // Sort findings consistently (errors first, then warnings, then info, then by ID)
  finalFindings.sort((a, b) => {
    const sevOrder: Record<AuditSeverity, number> = { error: 0, warning: 1, info: 2 };
    if (sevOrder[a.severity] !== sevOrder[b.severity]) {
      return sevOrder[a.severity] - sevOrder[b.severity];
    }
    return a.id.localeCompare(b.id);
  });

  const errors = finalFindings.filter((f) => f.severity === "error").length;
  const warnings = finalFindings.filter((f) => f.severity === "warning").length;
  const info = finalFindings.filter((f) => f.severity === "info").length;

  const score = calculateGuidanceScore(finalFindings);

  return {
    schemaVersion: SCHEMA_VERSION,
    repositoryPath: inventory.rootDir,
    timestamp: new Date().toISOString(),
    score,
    findings: finalFindings,
    summary: {
      total: finalFindings.length,
      errors,
      warnings,
      info,
    },
  };
}
