# SpecBridge

SpecBridge is a local-first requirements quality toolkit for repositories used by AI coding agents. It has two complementary modes:

- `specbridge audit` deterministically checks agent instructions against repository evidence.
- `specbridge bench` evaluates requirement-focused review and change behavior with reproducible cases, fixtures, scoring, and reports.

The audit path is provider-free. Benchmark review can run entirely offline; live model adapters are a separate optional package.

## Five-minute quick start

```bash
# Install and audit the current repository
pnpm install
pnpm exec specbridge audit

# Validate the consolidated review benchmark
pnpm exec specbridge bench validate --benchmark v0.2

# Run a deterministic fixture review without API keys
pnpm exec specbridge bench review \
  --reviewer json-file --fixture perfect --max-cases 3 \
  --output results/benchmarks/run.json
pnpm exec specbridge bench score --results results/benchmarks/run.json

# Validate and run a change-mode task in a temporary workspace
pnpm exec specbridge bench change validate --task tasks/change/authorization.yml
pnpm exec specbridge bench change run --task tasks/change/authorization.yml --agent mock
```

Use `specbridge --help` and `specbridge bench --help` for the command surface.

## Deterministic audit

SpecBridge understands root and nested `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` files, GitHub Copilot instructions, and scoped instruction files. It checks them against package scripts, package managers, runtime engines, repository paths, CI workflows, and instruction metadata.

Current rules include missing paths and scripts, package-manager and runtime conflicts, empty scopes, contradictory or duplicate guidance, stale references, CI command mismatches, command conflicts, invalid path escapes, and malformed metadata.

```bash
specbridge audit --strict
specbridge audit --format json
specbridge audit --format sarif
specbridge explain missing-path
```

The audit command never executes commands found in instruction files. It reads bounded local evidence, rejects repository escapes, and does not require network access or model credentials.

## Requirement contracts and coverage

`@specbridge/core` owns the canonical `RequirementContract` and `ReviewCoverageReport` schemas. `@specbridge/adapters` accepts the supported JSON, Markdown, and OpenSpec inputs; `@specbridge/sarif` converts evidenced violations to SARIF 2.1.0. Unknown schema versions fail closed.

Benchmark adapters for SpecBridge coverage reports and Swarm Review exports normalize into the same benchmark finding model. The benchmark package reuses Core's coverage status and criterion schemas; its `requirementId` field is only a benchmark result projection used for deterministic matching.

## Requirement benchmark mode

The consolidated benchmark surface keeps the useful SpecBench functionality in this repository:

- versioned review cases under `benchmarks/` with controlled reference fixtures;
- deterministic finding matching, precision, recall, F1, severity-weighted recall, critical detection, runtime, and cost metrics;
- offline JSON, canonical SpecBridge coverage, and Swarm Review ingestion;
- change-mode evaluation with temporary Git workspaces, patch capture, validation commands, cleanup, output redaction, and environment allowlisting;
- static JSON and HTML reports, experiment configurations, repetitions, descriptive statistics, and adjudication records;
- dry-run execution that makes no provider call.

For live model-backed runs, install `@specbridge/benchmark-adapters` explicitly and pass `--live`. The optional package contains the AI SDK/OpenAI dependency; Core, the audit packages, and offline benchmark commands do not.

```bash
pnpm add @specbridge/benchmark-adapters
OPENAI_API_KEY=... pnpm exec specbridge bench review --reviewer single-agent --live
pnpm exec specbridge bench experiment --config experiments/v0.3/single-agent.json --dry-run
```

Benchmark cases measure adherence to explicit requirements, not general code-review quality. Published results retain their fixture provenance and should be interpreted as controlled, directional evidence.

## Packages

- `@specbridge/core`: canonical contracts, coverage validation, findings, scoring primitives, and audit schemas.
- `@specbridge/parsers`: agent-instruction parsers.
- `@specbridge/repository`: repository evidence scanner.
- `@specbridge/rules`: deterministic audit rules and orchestrator.
- `@specbridge/adapters`: contract input adapters.
- `@specbridge/sarif`: SARIF 2.1.0 conversion.
- `@specbridge/benchmark`: offline benchmark cases, adapters, scoring, reporting, change evaluation, and budget ledger.
- `@specbridge/benchmark-adapters`: optional live model adapters.
- `@specbridge/cli`: `audit`, `explain`, legacy contract commands, and the unified `bench` command group.

## Swarm Review relationship

`EvanGribar/Swarm-Review` remains a separate product and repository. This repository provides the canonical contract/coverage boundary and an offline Swarm Review ingestion adapter; it does not change Swarm Review's agent execution, debate, GitHub API, or PR-comment workflow. See [the integration follow-up](docs/SWARM_REVIEW_INTEGRATION.md).

The former SpecBench repository is not archived or deleted by this migration. See [the consolidation plan](docs/SPECBENCH_CONSOLIDATION_PLAN.md) and [the retirement readiness proposal](docs/SPECBENCH_RETIREMENT_PLAN.md) for parity gates and the future, separately approved retirement operation.

## CI integration

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

## Status

SpecBridge is in active product validation. Start with the [architecture](docs/ARCHITECTURE.md), [benchmark guide](docs/benchmark/README.md), and [compatibility notes](docs/COMPATIBILITY.md).
