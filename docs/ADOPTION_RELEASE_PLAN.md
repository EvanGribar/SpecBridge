# Adoption and release plan

## Evidence and scope

This change consolidates the useful SpecBench benchmark functionality into SpecBridge. Swarm Review remains an independent consumer and is not modified here. The old SpecBench repository and its existing pins remain intact until a separate retirement decision.

## Release decision

The contract and coverage schema remain explicitly versioned at `1.0`. The publishable workspace packages currently declare `0.4.0`; the root workspace metadata is older and must be reconciled by the normal independent-package release workflow before publication. Benchmark packages should be released with their dependency graph, while the live adapter package remains optional.

## Boundaries and validation

Core owns schemas and contract-aware coverage validation. Parsers, Repository, Rules, Adapters, and SARIF use Core's public export. The benchmark package uses Core without defining a parallel public coverage contract. The CLI imports offline benchmark code directly and dynamically loads live adapters only for explicit `--live` runs.

The release check should generate schemas, run typecheck, lint, build, the full test suite, pack every publishable package, install the packed artifacts in isolation, and exercise audit plus offline benchmark smoke commands.

## Publishing, migration, and rollback

Consumers can migrate from git pins or the old benchmark repository to published `@specbridge/*` packages on their own schedules. Publish the GitHub release and tested tarballs only after package-version alignment, offline parity, and optional-adapter installation are proven. Roll back by deprecating a bad package version and reverting consumer dependency updates; do not rewrite tags or published packages.

## Known blockers

Repository contents cannot establish npm namespace ownership, trusted-publishing configuration, or Swarm Review's upstream implementation schedule. These require release-owner and upstream follow-up decisions.
