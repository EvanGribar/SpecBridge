# SpecBridge

SpecBridge audits the instructions AI coding agents use in your repository.

Coding agents increasingly rely on files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and Copilot instructions. Those files can become stale, contradict each other, or drift away from the repository they describe. SpecBridge checks them against your codebase and CI configuration before agents act on bad guidance.

## Before and After

### Before
```text
CLAUDE.md: "Run npm test and check apps/api before submitting PRs."
Reality:   Repository uses pnpm, apps/api was deleted last month, and CI runs pnpm test:ci.
Result:    AI agents fail builds, introduce invalid lockfiles, and hallucinate code edits.
```

### After
```bash
$ specbridge audit

SpecBridge audit

Repository guidance score: 72/100

Errors
- CLAUDE.md references apps/api, but that directory does not exist.
- .github/copilot-instructions.md instructs agents to run npm test, but the repository uses pnpm.
- AGENTS.md requires Node.js 20, but package.json requires Node.js >=24.

Summary
3 errors, 0 warnings, 0 informational findings
```

## Five-Minute Quick Start

```bash
# Audit current repository
pnpm exec specbridge audit

# Audit in strict CI mode (exit code 1 on errors)
pnpm exec specbridge audit --strict

# Export audit findings as JSON or GitHub SARIF
pnpm exec specbridge audit --format json
pnpm exec specbridge audit --format sarif

# Explain a specific finding or rule
pnpm exec specbridge explain missing-path
```

## Supported Instruction Files

- Root and nested `AGENTS.md`
- Root and nested `CLAUDE.md`
- Root and nested `GEMINI.md`
- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`

## Current Deterministic Checks

1. **`missing-path`**: Referenced file or directory does not exist.
2. **`missing-script`**: Referenced package script is not defined in `package.json`.
3. **`package-manager-conflict`**: Wrong package manager specified in instructions (e.g. `npm` vs `pnpm`).
4. **`runtime-conflict`**: Node.js/runtime version conflicts with repository engine config.
5. **`empty-scope`**: Scoped instruction glob (`applyTo`) matches zero files.
6. **`contradictory-guidance`**: Nested instruction file contradicts root instruction.
7. **`duplicate-guidance`**: Identical instruction text appears in multiple files with inconsistent wording.
8. **`stale-reference`**: Guidance references deleted or renamed paths/scripts.
9. **`ci-command-mismatch`**: CI workflows and instruction files specify inconsistent validation commands.
10. **`command-conflict`**: Multiple instruction files give conflicting commands for the same operation.
11. **`invalid-path-escape`**: Instruction path attempts to escape repository bounds.
12. **`malformed-metadata`**: Invalid YAML frontmatter or instruction metadata.

## JSON and SARIF Output

### JSON Output (`specbridge audit --format json`)
```json
{
  "schemaVersion": "1.0",
  "repositoryPath": "/repo",
  "timestamp": "2026-07-26T13:22:00.000Z",
  "score": {
    "value": 72,
    "max": 100,
    "deductions": [
      { "ruleId": "package-manager-conflict", "count": 1, "deduction": 10 },
      { "ruleId": "missing-path", "count": 2, "deduction": 18 }
    ]
  },
  "findings": [
    {
      "id": "missing-path:CLAUDE.md:3:apps/api",
      "ruleId": "missing-path",
      "severity": "error",
      "title": "Referenced file or directory does not exist",
      "description": "Instruction file references 'apps/api', but that file or directory does not exist in the repository.",
      "evidence": [{ "file": "CLAUDE.md", "line": 3, "excerpt": "apps/api" }],
      "confidence": "deterministic"
    }
  ],
  "summary": { "total": 3, "errors": 3, "warnings": 0, "info": 0 }
}
```

### SARIF Output (`specbridge audit --format sarif`)
Produces standard GitHub Code Scanning SARIF 2.1.0 output for direct integration with GitHub Security tab and PR checks.

## Security Model

- **Zero Command Execution**: SpecBridge never executes shell commands found in instruction files.
- **Path Traversal Guardrails**: Rejects symlinks or paths pointing outside the repository root.
- **No Secret Leakage**: Secret values or environment tokens are never logged or printed.
- **Offline First**: Runs completely locally without requiring network connections or external API keys.

## CI Integration Example

```yaml
name: Audit Agent Instructions

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec specbridge audit --strict
```

## Packages

- `@specbridge/core`: Core audit schemas, findings model, scoring formula, and legacy contract schemas.
- `@specbridge/parsers`: Agent instruction parsers for `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and Copilot instructions.
- `@specbridge/repository`: Repository evidence scanner (package managers, scripts, engines, CI workflows, monorepos).
- `@specbridge/rules`: 12 deterministic audit rules and orchestrator.
- `@specbridge/sarif`: SARIF 2.1.0 converter for audit findings and legacy coverage reports.
- `@specbridge/cli`: Command-line auditor interface (`specbridge audit`, `specbridge explain`).
- `@specbridge/adapters`: Legacy requirement contract input adapters.

## Relationship to Original Requirement Contracts

SpecBridge's original requirement-contract schemas (`RequirementContract`, `ReviewCoverageReport`) and adapters (`JsonAdapter`, `MarkdownAdapter`, `OpenSpecAdapter`) remain supported as lower-level interoperability capabilities.

## Status

SpecBridge is currently in active product validation. Feedback and dogfooding reports are welcome in `docs/PIVOT_VALIDATION.md`.
