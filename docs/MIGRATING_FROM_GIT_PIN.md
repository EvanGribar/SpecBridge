# Migrating from a Git pin

Swarm Review may keep its current SpecBridge submodule and commit pin until its own integration is ready. The old SpecBench repository should not be archived as part of this migration; its benchmark consumers can move to the consolidated packages independently.

For a package consumer, replace the old bridge or submodule with the published dependencies it uses:

```json
{
  "dependencies": {
    "@specbridge/core": "^0.4.0",
    "@specbridge/adapters": "^0.4.0",
    "@specbridge/sarif": "^0.4.0",
    "@specbridge/benchmark": "^0.4.0",
    "@specbridge/cli": "^0.4.0"
  },
  "optionalDependencies": {
    "@specbridge/benchmark-adapters": "^0.4.0"
  }
}
```

Use `@specbridge/core` directly for contracts and coverage; the broken `specbridge-bridge` re-export is not part of the consolidated tree. Retain fixture provenance, run the consumer's existing offline suite, and add the Swarm Review criterion-id follow-up before changing its live workflow.
