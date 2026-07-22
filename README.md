# SpecBridge

SpecBridge turns software specifications into portable requirement contracts and converts AI review coverage into interoperable SARIF findings.

SpecBridge sits between specification sources, reviewers such as Swarm-Review, and evaluators such as SpecBench. It normalizes requirements, validates criterion-level coverage, and produces SARIF for confirmed, evidenced violations. It is not an AI reviewer, agent framework, benchmark, GitHub bot, dashboard, hosted service, model abstraction, or specification-authoring product.

```text
Specification sources
        |
        v
    SpecBridge
    /        \\
   v          v
Swarm-Review  SpecBench
 producer     evaluator
```

## Adopted ecosystem

[Swarm-Review v1.1.0](https://github.com/EvanGribar/Swarm-Review/releases/tag/v1.1.0) consumes SpecBridge requirement contracts, produces canonical coverage, generates SARIF through SpecBridge, and retains requirement statuses and evidence. Its integration is opt-in and has mocked offline validation; separate live-provider quality validation is pending in [issue #66](https://github.com/EvanGribar/Swarm-Review/issues/66).

[SpecBench v0.4.0-beta](https://github.com/EvanGribar/SpecBench/releases/tag/v0.4.0-beta) consumes canonical coverage, preserves statuses, scores criterion outcomes, validates evidence metadata, and includes a provenance-pinned Swarm-Review fixture for offline CLI evaluation.

These are interoperability claims, not a claim that SpecBridge is an industry standard. Integration correctness means the artifacts round-trip between projects; model-quality validation concerns reviewer behavior; benchmark accuracy remains SpecBench's responsibility.

## Five-minute quick start

```bash
pnpm install --frozen-lockfile
pnpm specbridge extract examples/account-limits.json
pnpm specbridge validate examples/account-limits.json
pnpm specbridge validate-coverage examples/review-output/coverage.json
pnpm specbridge to-sarif examples/review-output/coverage.json --output=findings.sarif
```

`coverage.json` records every criterion outcome. `findings.sarif` contains only evidenced violations.

## Packages

- `@specbridge/core`: canonical Zod schemas and TypeScript types.
- `@specbridge/adapters`: JSON, constrained Markdown, and constrained OpenSpec input.
- `@specbridge/sarif`: SARIF 2.1.0 conversion.
- `@specbridge/cli`: local extraction, validation, inspection, and conversion.

See [architecture](docs/ARCHITECTURE.md), [compatibility](docs/COMPATIBILITY.md), [migration from git pins](docs/MIGRATING_FROM_GIT_PIN.md), [Swarm-Review integration](docs/SWARM_REVIEW_INTEGRATION.md), and [SpecBench integration](docs/SPECBENCH_INTEGRATION.md). Contracts use explicit major schema versions; unknown versions are rejected. Current limits: no YAML, external references, arbitrary Markdown extraction, or upstream integration package. Inputs are untrusted and size-limited; paths are repository-relative and SARIF output only represents evidenced violations. The [roadmap](ROADMAP.md) tracks remaining work.
