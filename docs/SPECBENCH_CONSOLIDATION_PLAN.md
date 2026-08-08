# SpecBench consolidation plan

## Goal

Make SpecBridge the single toolkit for improving repository-based AI coding-agent reliability:

- `specbridge audit` checks whether repository guidance is accurate and internally consistent.
- `specbridge bench review` measures whether a reviewer follows explicit product requirements.
- `specbridge bench change` evaluates whether an agent makes a requirement-preserving repository change.

Swarm Review remains a separate product and repository.

## Audited starting point

SpecBridge already owns the published requirement-contract and coverage-report schemas in `@specbridge/core`, deterministic repository auditing, SARIF conversion, and the provider-free CLI path. SpecBench owns benchmark cases, deterministic finding matching and metrics, review adapters, change-mode evaluation, reporting, experiments, and fixtures. SpecBench also contains a duplicate coverage model and a `specbridge-bridge` package that re-exports a missing `vendor/specbridge` submodule.

## Migration shape

1. Add `@specbridge/benchmark` for benchmark cases, run/change contracts, deterministic scoring, reporting, controlled fixtures, and offline adapters. It will import coverage schemas from `@specbridge/core` instead of defining parallel SpecBridge types.
2. Add `@specbridge/benchmark-adapters` for optional live AI SDK/OpenAI adapters. The package will not be required by `@specbridge/core`, the audit packages, or the normal audit command.
3. Move the useful SpecBench benchmark cases, change tasks, fixtures, experiment configurations, and methodology documents into SpecBridge, preserving versioned paths and attribution.
4. Extend `@specbridge/cli` with a small `bench` command group. Offline review, scoring, reporting, validation, and change evaluation remain available without provider configuration; live reviewers load only when explicitly requested.
5. Remove the `specbridge-bridge` abstraction and migrate the SpecBridge coverage adapter to the canonical `@specbridge/core` exports.
6. Rewrite the README and integration documents around the two-mode product, while documenting the exact Swarm Review follow-up surface and a non-destructive SpecBench retirement proposal.

## Proof required

The migration is complete only when existing audit/conformance tests remain green; review and change fixtures produce equivalent scores; reports and experiments remain reproducible; audit and offline benchmark commands run without API keys; live adapters are opt-in; path, environment, and temporary-workspace boundaries remain tested; and the relevant build, typecheck, lint, test, package, and release checks pass.

## History and retirement

The first implementation will preserve SpecBench attribution in the consolidated package and migration documentation and will not archive, delete, or rewrite the old repository. After parity and a viable release are demonstrated, SpecBench can receive a final redirect README and be archived in a separate, explicitly approved operation.
