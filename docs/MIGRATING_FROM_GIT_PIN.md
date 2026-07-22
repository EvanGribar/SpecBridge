# Migrating from a Git pin

Swarm-Review and SpecBench may keep their current SpecBridge submodule and commit pin until they intentionally migrate. Their current pin, `7555472ea92d5876fa212376d43d40997ae1da81`, remains compatible.

When ready, replace the submodule or local bridge with published dependencies:

```json
{
  "dependencies": {
    "@specbridge/core": "^0.2.0",
    "@specbridge/adapters": "^0.2.0",
    "@specbridge/sarif": "^0.2.0",
    "@specbridge/cli": "^0.2.0"
  }
}
```

Swarm-Review should use Core contracts and coverage reports plus the SARIF package instead of a local SARIF bridge. SpecBench should ingest Core coverage records through its native adapter. Retain fixture provenance while switching the dependency, run each project's existing offline suite, then remove only the obsolete submodule references.
