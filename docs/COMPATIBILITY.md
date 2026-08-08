# Compatibility

| Surface | Current compatibility | Status |
| --- | --- | --- |
| Core contract and coverage schemas | Schema `1.0` | supported; unknown versions fail closed |
| SARIF output | SARIF `2.1.0` | supported by GitHub Code Scanning shape |
| SpecBridge package line | publishable packages currently declare `0.4.0` | migration implementation; release alignment still requires the normal release check |
| Swarm Review | v1.1.0 and its existing SpecBridge pin | external consumer; unchanged by this repository change |
| Consolidated benchmark cases | review `v0.1`/`v0.2`, change tasks, offline fixtures, v0.3 experiment material | migrated and validated locally |

- Packages are ESM-only, include TypeScript declarations, and support Node.js `>=20`.
- The deterministic audit path and offline benchmark path do not import AI SDK/OpenAI modules.
- `@specbridge/benchmark-adapters` is optional and contains live model dependencies only.
- Pre-1.0 package APIs may change in minor releases. Additive schema changes are preferred; breaking contract changes require a new schema version.
- Existing benchmark result and budget-ledger identifiers retain compatibility names where changing them would invalidate published provenance. New user-facing commands and reports use `specbridge bench` and `SpecBridge benchmark` terminology.
- The old SpecBench repository is not an active package dependency and remains available until the retirement gates are approved.
