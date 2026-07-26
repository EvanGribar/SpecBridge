# Adoption and release plan

## Evidence and scope

SpecBridge commit `7555472ea92d5876fa212376d43d40997ae1da81` is pinned by [Swarm-Review](https://github.com/EvanGribar/Swarm-Review) v1.1.0 (`7330c7a5e5bbd7eb6d8211e9009c77f5a1d75d5c`) and [SpecBench](https://github.com/EvanGribar/SpecBench) v0.4.0-beta (`953f9dbbdce003fc892e2cbed3ab620a17699c92`). This repository alone is changed; those pins remain valid until each consumer opts into packages.

## Release decision

The first package-consumption release is `0.2.0`: the contract schema is stable within its explicit `1.0` schema version, while the TypeScript API remains pre-1.0. All four packages are fixed together and internal dependencies use pnpm's `workspace:^` protocol, which is rewritten to compatible published ranges when packed.

## Boundaries, validation, and workflow

Core owns schemas and contract-aware coverage validation. Parsers, Repository, Rules, Adapters, and SARIF use Core's public export; CLI uses package imports. CI generates schemas, runs typecheck/test/lint/build, and validates packed artifacts. Release Please supports future release PRs and automated GitHub release notes based on Conventional Commits.

## Publishing, migration, and rollback

Package publication is conditional on ownership, npm trusted-publishing configuration, and successful CI. Consumers can move from git pins to `^0.2.0` package ranges on their own schedules. Roll back by deprecating a bad npm version, retaining the immutable GitHub tag, and reverting consumer dependency updates; do not rewrite tags or published packages.

## Known blockers

This audit cannot establish npm namespace ownership or trusted-publisher configuration from repository contents. If either is absent, publish the GitHub release and attach tested tarballs rather than attempting npm publication.
