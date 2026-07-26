# SpecBridge Pivot Validation Document

## 1. Old Problem Statement
SpecBridge was originally designed as a niche requirement-contract normalization and review-coverage interoperability library between Swarm-Review and SpecBench. While technically sound, this scope was too narrow: few developers needed lower-level requirement contract schemas in isolation.

## 2. Why It Was Too Narrow
- Requirement contracts required custom schema integration before providing value.
- Developers already maintain instruction files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Copilot instructions) directly in their repositories.
- AI coding agents routinely fail when instructions contain stale directory paths, invalid package manager commands, mismatched Node versions, or conflicting guidelines across nested files.

## 3. New Hypothesis
> **Hypothesis**: A local-first auditor that inspects repository instructions used by AI coding agents and compares them against actual repository evidence (package.json, lockfiles, CI workflows, directory structure, and engine specs) will prevent AI agents from acting on bad guidance and provide instant user value in 5 seconds.

## 4. MVP Scope
The pivot MVP provides deterministic auditing for:
- Root & nested `AGENTS.md`
- Root & nested `CLAUDE.md`
- Root & nested `GEMINI.md`
- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`

### Core Deterministic Rules
1. `missing-path`: Referenced file or directory does not exist.
2. `missing-script`: Referenced package script does not exist.
3. `package-manager-conflict`: Instruction specifies a package manager that conflicts with repository setup.
4. `runtime-conflict`: Node/runtime version conflicts with repository engine config.
5. `empty-scope`: Scoped instruction glob matches zero files.
6. `contradictory-guidance`: Nested instruction file contradicts root instruction.
7. `duplicate-guidance`: Same instruction duplicated across files with inconsistent wording.
8. `stale-reference`: Guidance references deleted or renamed paths/scripts.
9. `ci-command-mismatch`: CI workflows and instruction files specify inconsistent validation commands.
10. `command-conflict`: Multiple instruction files give conflicting commands for the same operation.
11. `invalid-path-escape`: Guidance path escapes repository bounds.
12. `malformed-metadata`: Instruction file contains malformed frontmatter metadata.

## 5. Non-Goals
- Hosted dashboards or web applications.
- Universal new spec authoring DSL.
- Automatic destructive file rewriting.
- Hosted MCP marketplaces.
- Heuristic AI-only linters without deterministic evidence.

## 6. Dogfooding Repositories & Findings
Audited repositories during initial validation:
1. `EvanGribar/SpecBridge` (clean score: 100/100, 0 findings).
2. Synthetic test fixture repos demonstrating:
   - Node 20 vs Node >=24 mismatches.
   - Deleted `apps/api` directory references in `CLAUDE.md`.
   - `npm test` instructions in `pnpm` monorepos.
   - `pnpm test` vs `pnpm test:ci` mismatches between instructions and GitHub Actions.

## 7. Continuation Criteria
- Audit at least 5 real repositories.
- Find at least 3 meaningful, actionable issues.
- Confirm usefulness with at least 2 external developers.
- Demonstrate at least 1 CI adoption or repeated local workflow.

## 8. Release Automation Migration
Migrated from Changesets to Release Please:
- Repository is maintained by a small team / single maintainer with linked package versioning.
- Release Please automates pull requests, changelogs, semver versioning, and GitHub releases seamlessly based on Conventional Commits (`feat:`, `fix:`, `docs:`).
