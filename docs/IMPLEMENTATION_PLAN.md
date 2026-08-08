# Implementation plan

1. Define the canonical `1.0` contract and coverage schemas with fail-closed validation.
2. Add deliberately limited JSON, Markdown, and OpenSpec adapters.
3. Convert evidenced violations to GitHub-compatible SARIF 2.1.0.
4. Provide deterministic audit commands, generated JSON Schema, fixtures, and conformance tests.
5. Consolidate benchmark cases, change tasks, offline adapters, scoring, reports, experiments, and fixtures under `@specbridge/benchmark`.
6. Isolate live AI SDK/OpenAI adapters in `@specbridge/benchmark-adapters` and keep them opt-in.
7. Provide the unified `specbridge bench` CLI while preserving legacy contract commands.
8. Publish integration guidance without modifying Swarm Review or archiving SpecBench.
9. Complete a clean-install release audit and separately evaluate retirement readiness.
