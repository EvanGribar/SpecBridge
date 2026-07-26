# SpecBridge Pivot Validation Document

## 1. Repository Audited
- **Primary Repository**: `EvanGribar/SpecBridge`
- **Fixture Repositories**: 10 synthetic test scenarios located in `tests/fixtures/`.

## 2. Findings Produced during Audit & Dogfooding

### Clean Repository Audit (`EvanGribar/SpecBridge`)
```text
SpecBridge audit

Repository guidance score: 100/100

Summary
0 errors, 0 warnings, 0 informational findings
```

### Synthetic Test Scenarios Findings
Auditing fixture scenarios produced 12 distinct findings across rules:
- **`missing-path`**: Flagged deleted `apps/api` reference in `CLAUDE.md` and missing `src/index.ts`.
- **`package-manager-conflict`**: Flagged `npm test` instructions in `pnpm` monorepos and `npm-says-pnpm` repos.
- **`runtime-conflict`**: Flagged `AGENTS.md` requiring Node.js 20 when `package.json` specifies `>=24`.
- **`empty-scope`**: Flagged Copilot `applyTo` glob `src/billing/**/*.ts` matching zero files.
- **`contradictory-guidance`**: Flagged contradictory `pnpm migrate` (root) vs `npm run db:migrate` (nested `src/db/AGENTS.md`).
- **`duplicate-guidance`**: Flagged identical instructions across `AGENTS.md` and `CLAUDE.md`.
- **`ci-command-mismatch`**: Flagged `AGENTS.md` recommending `pnpm test` when GitHub Actions workflow executes `pnpm test:ci`.
- **`invalid-path-escape`**: Flagged `../external_secret.txt` attempting to escape repository root.
- **`malformed-metadata`**: Flagged unclosed YAML frontmatter `---`.

## 3. True Positives
- **Command & Package Manager Mismatches**: Successfully identified when agent instructions tell agents to use `npm` in `pnpm` monorepos or mismatched CI test targets (`pnpm test:ci` vs `pnpm test`).
- **Path Escapes & Stale References**: Successfully caught path escapes (`../external_secret.txt`) and non-existent path references (`apps/api`).
- **Node.js Version Desynchronization**: Caught version conflicts between agent markdown text (`Node 20`) and `package.json` engines (`>=24`).

## 4. False-Positive Risks & Mitigation
- **False-Positive Risk**: Plain English words or technical jargon in markdown files looking like file paths or script names.
- **Mitigation Implemented**:
  - Path parser filters out URLs (`http://`, `https://`), version numbers (`v1.2.3`, `20.0`), single-letter tokens, and bare words without path separators `/` or file extensions.
  - Script matcher excludes standard system commands (`node`, `tsx`, `vitest`, `tsc`, `eslint`, `prettier`, `install`, `add`, `remove`).
  - Ignore list filters test fixture folders (`fixtures/`) during workspace root audits.

## 5. Rules Needing Refinement
- Monorepo package script inheritance: In nested workspace subpackages, scripts defined in child `package.json` manifests should be checked relative to the child package root.

## 6. Release Automation Status
- **System**: [Release Please](https://github.com/googleapis/release-please) (`release-please-config.json` & `.release-please-manifest.json`).
- **Workflow**: `.github/workflows/release.yml` with minimal token permissions (`contents: write`, `pull-requests: write`).
- **Versioning Strategy**: Coordinated linked monorepo package versioning (`separate-pull-requests: false`) managing all 7 workspace packages (`@specbridge/*`).
- **Changesets Status**: Fully removed. Zero changeset packages, scripts, or pending files remain.

## 7. Remaining External Blockers
- **npm Publishing**: Disabled until trusted publishing and npm package ownership are configured on npmjs.org. Release Please operates safely independently of npm publishing.

## 8. Readiness for External Testing
- **Verdict**: SpecBridge is **ready for testing on external repositories**. It executes deterministically in < 1 second, works from packed CLI artifacts, produces clean human/JSON/SARIF output, and finds genuine guidance drift without creating excessive noise.
