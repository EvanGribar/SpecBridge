# SpecBridge

SpecBridge turns software specifications into portable requirement contracts and converts AI review coverage into interoperable SARIF findings.

SpecBridge sits between specification sources, reviewers such as Swarm-Review, and evaluators such as SpecBench. It normalizes requirements, validates criterion-level coverage, and produces SARIF for confirmed, evidenced violations. It is not an AI reviewer, agent framework, benchmark, GitHub bot, dashboard, hosted service, model abstraction, or specification-authoring product.

```text
OpenSpec / Markdown / JSON -> SpecBridge contract -> reviewers -> coverage.json -> findings.sarif -> SpecBench
```

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

See [architecture](docs/ARCHITECTURE.md), [Swarm-Review integration](docs/SWARM_REVIEW_INTEGRATION.md), and [SpecBench integration](docs/SPECBENCH_INTEGRATION.md). Contracts use explicit major schema versions; unknown versions are rejected. Current limits: no YAML, external references, arbitrary Markdown extraction, or upstream integration package. Inputs are untrusted and size-limited; paths are repository-relative and SARIF output only represents evidenced violations. The [roadmap](ROADMAP.md) tracks remaining work.
