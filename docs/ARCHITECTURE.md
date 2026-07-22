# Architecture

SpecBridge is a local, offline interoperability layer. It owns a versioned requirement contract, adapters into that contract, coverage-report validation, SARIF conversion, and conformance fixtures.

```text
Specification files -> @specbridge/adapters -> @specbridge/core contract
Reviewer output -> validated coverage.json -> @specbridge/sarif -> findings.sarif
```

The contract is deliberately reviewer-neutral. Swarm-Review remains responsible for LLM execution, GitHub API interactions, debate, and PR comments. SpecBench remains responsible for benchmark cases, expected findings, matching, and precision/recall/F1 scoring. This separation is based on their current public schemas: Swarm-Review's `Finding` has `severity`, `file`, `line`, `claim`, and `confidence`; SpecBench normalizes findings around `requirementReference` before scoring.

## Data and safety decisions

- `schemaVersion` is exact (`1.0`); unknown breaking formats fail closed.
- Repository paths are relative, reject `..`, backslashes, and absolute paths.
- Input reads are capped at 1 MB by default and constrained to the working directory.
- Violated criteria require evidence. Satisfied and unverifiable criteria have no SARIF output.
- SARIF uses version 2.1.0, stable rule IDs, SHA-256 partial fingerprints, `SRCROOT`-relative locations, and only local evidence URIs.

## OpenSpec subset

The adapter only accepts a file under `openspec/specs/` using the current OpenSpec headings: `# title`, `### Requirement: title`, and `#### Scenario: title`. Requirement and scenario titles become stable slug IDs. It does not infer requirements from arbitrary prose, parse change deltas, or resolve references.

Authoritative references: [OASIS SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html), [GitHub's SARIF-supported subset](https://docs.github.com/en/code-security/reference/code-scanning/sarif-support-for-code-scanning), and [Fission-AI OpenSpec](https://github.com/Fission-AI/OpenSpec).
