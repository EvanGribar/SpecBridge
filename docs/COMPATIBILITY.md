# Compatibility

| SpecBridge | Swarm-Review | SpecBench | Status |
| --- | --- | --- | --- |
| 0.2.0 | [v1.1.0](https://github.com/EvanGribar/Swarm-Review/releases/tag/v1.1.0) | [v0.4.0-beta](https://github.com/EvanGribar/SpecBench/releases/tag/v0.4.0-beta) | supported |

- Contract and coverage schema version `1.0` is supported. Unknown schema versions fail closed.
- SARIF output is SARIF `2.1.0`, with repository-relative evidence locations and GitHub Code Scanning-compatible shape.
- Packages are ESM-only, include TypeScript declarations, and support Node.js `>=20`.
- Pre-1.0 package APIs may change in minor releases. Schema-compatible additive fields and non-breaking implementation fixes are supported; breaking schema changes require a new schema version.
- Deprecated APIs receive a documented migration path before removal. Unknown fields are not interoperability guarantees and consumers must preserve only documented fields.
- The current Swarm-Review and SpecBench pins target `7555472ea92d5876fa212376d43d40997ae1da81`; package migration is opt-in and does not invalidate them.
