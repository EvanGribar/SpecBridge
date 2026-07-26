# Contributing to SpecBridge

Thank you for contributing to SpecBridge!

## Development Setup

Requirements:
- Node.js >= 20
- pnpm (version specified in `package.json`)

```bash
pnpm install
pnpm build
pnpm test
pnpm release:check
```

## Conventional Commits & Releases

SpecBridge uses [Release Please](https://github.com/googleapis/release-please) for automated versioning, changelog generation, and GitHub releases.

Please use standard Conventional Commit prefixes:
- `feat:` New feature or audit rule (triggers minor release)
- `fix:` Bug fix or rule refinement (triggers patch release)
- `docs:` Documentation updates
- `refactor:` Code refactoring
- `test:` Adding or updating test cases
- `BREAKING CHANGE:` Breaking API change (triggers major release)
