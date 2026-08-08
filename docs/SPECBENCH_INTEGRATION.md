# Consolidated benchmark integration

The useful review and change-evaluation functionality formerly maintained in SpecBench now lives in `@specbridge/benchmark` and the `specbridge bench` CLI group. The old repository is left untouched while consumers migrate.

## Canonical flow

1. A case under `benchmarks/<version>/<case>/case.json` defines the requirement, patch, expected findings, matching rules, and provenance.
2. A reviewer adapter produces normalized findings or a canonical SpecBridge coverage report.
3. The deterministic scorer matches findings to expected findings and calculates precision, recall, F1, severity-weighted recall, critical detection, runtime, and cost.
4. The reporter writes JSON and static HTML; experiment summaries and human adjudication remain separate.

`@specbridge/benchmark` reuses Core's `CoverageStatus` and criterion coverage schemas. Its benchmark-only `requirementId` on a criterion result is a projection used to associate a result with a case mapping; it is not a second public SpecBridge coverage contract.

## Offline adapters

```bash
specbridge bench review --reviewer json-file --fixture perfect
specbridge bench review --reviewer specbridge --input path/to/coverage.json
specbridge bench review --reviewer swarm-review --input path/to/swarm-review-export.json
```

The adapters preserve raw input and provenance in the run result. A Swarm Review export without explicit requirement references can be ingested for integration checks, but it cannot be scored losslessly against criterion-level expectations until the upstream workflow emits a criterion identifier.

## Optional live adapters

The AI SDK/OpenAI implementation is isolated in `@specbridge/benchmark-adapters`. It is loaded only when a caller explicitly uses `--live`; installing or importing Core, the audit packages, or offline benchmark commands does not require model dependencies.

```bash
pnpm add @specbridge/benchmark-adapters
OPENAI_API_KEY=... specbridge bench review --reviewer single-agent --live
specbridge bench experiment --config experiments/v0.3/single-agent.json --dry-run
```

Live calls require explicit provider configuration and use the budget-ledger controls documented in the v0.3 experiment notes. Do not treat a dry run as evidence of model quality.

The consolidated names are `SPECBRIDGE_MODEL`, `SPECBRIDGE_INPUT_USD_PER_MILLION`, and `SPECBRIDGE_OUTPUT_USD_PER_MILLION`. The previous `SPECBENCH_*` names remain accepted as compatibility aliases for existing experiment material.

## Migration from the old package

Replace imports from the old SpecBench packages with:

```ts
import {
  JsonFileAdapter,
  SpecBridgeAdapter,
  SwarmReviewAdapter,
  scoreRun,
  writeReports,
} from "@specbridge/benchmark";
```

The versioned case, task, fixture, experiment, and published-result paths were retained under this repository so existing evaluation material remains reviewable. The old `specbridge-bridge` package is not carried forward; Core is the direct contract dependency.
