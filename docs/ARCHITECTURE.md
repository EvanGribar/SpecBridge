# Architecture

SpecBridge is a local-first requirements quality toolkit with one canonical contract boundary and two execution modes.

```text
Repository instructions -> repository evidence -> @specbridge/rules -> audit report

Requirement sources -> @specbridge/adapters -> @specbridge/core contract
Reviewer output -> benchmark adapters -> @specbridge/benchmark -> scores/reports
                                      \-> canonical coverage validation -> SARIF

Change task -> temporary Git workspace -> agent adapter -> validation + requirement checks -> change result
```

## Package ownership

`@specbridge/core` owns the published `RequirementContract`, `ReviewCoverageReport`, coverage status vocabulary, evidence model, and audit schemas. Parsers, repository scanning, rules, contract adapters, and SARIF conversion depend on Core's public exports.

`@specbridge/benchmark` owns versioned benchmark case/run/change schemas, normalized findings, deterministic matching and aggregate metrics, offline adapters, experiment reporting, adjudication records, controlled fixtures, temporary workspaces, validation, redaction, environment allowlisting, and the live budget ledger. It consumes Core coverage schemas instead of defining a second public SpecBridge contract.

`@specbridge/benchmark-adapters` is optional. It contains the AI SDK/OpenAI implementation for single-agent and controlled-swarm reviewers. The CLI loads it dynamically only for an explicit `--live` run. The audit path and offline benchmark path have no model-provider dependency.

`@specbridge/cli` is the user-facing composition layer. `audit` stays deterministic and provider-free; `bench` exposes offline review, scoring, reports, experiments, and change evaluation, with live execution opt-in.

## Canonical data flow

1. A repository audit scans bounded local evidence and produces deterministic findings or SARIF.
2. A benchmark case defines a requirement, repository patch, expected findings, source locations, and matching metadata.
3. An offline or live reviewer produces normalized findings. Canonical SpecBridge coverage and Swarm Review exports are accepted through adapters.
4. The scorer matches findings deterministically and calculates precision, recall, F1, severity-weighted recall, critical detection, runtime, and cost metrics.
5. Reporters write stable JSON and static HTML. Experiment summaries keep automatic results separate from human adjudication.
6. Change mode copies a controlled fixture into a temporary Git repository, runs an agent with an explicit environment allowlist, captures the diff, runs validation and requirement checks, redacts configured secrets, and cleans up.

## Safety and reproducibility decisions

- `schemaVersion` is exact; unknown breaking formats fail closed.
- Repository paths are relative, reject `..`, backslashes, and absolute paths, and remain inside the declared case or workspace.
- Input reads are bounded and controlled by the relevant schema or adapter.
- The audit path never executes instructions, patches, validation commands, or model calls.
- Live model calls require explicit `--live`, a provider credential, and (for the smoke workflow) a reconciled hard budget ledger.
- Change-mode child processes receive only the configured environment allowlist; stdout and stderr are size-limited and secret-redacted before results are persisted.
- Temporary workspaces are initialized with a baseline commit, diffed deterministically, and removed in a `finally` cleanup path.
- Benchmark fixtures and published results retain provenance; they are controlled evidence, not claims of general review quality.

## Swarm Review boundary

Swarm Review remains responsible for agent execution, debate, GitHub API interactions, and PR comments in its own repository. SpecBridge supplies canonical contract/coverage schemas and an offline ingestion adapter. A future upstream integration must make criterion selection explicit so a finding can be mapped losslessly to a requirement. See [SWARM_REVIEW_INTEGRATION.md](SWARM_REVIEW_INTEGRATION.md).

## Historical migration boundary

The benchmark implementation originated in SpecBench and was consolidated here after an audit of both repositories. The migration removes the broken `specbridge-bridge` indirection, preserves useful benchmark artifacts and result compatibility, and leaves the old repository untouched. Retirement remains gated by the parity checks in [SPECBENCH_RETIREMENT_PLAN.md](SPECBENCH_RETIREMENT_PLAN.md).

## OpenSpec subset

The OpenSpec adapter accepts a file under `openspec/specs/` using the current headings `# title`, `### Requirement: title`, and `#### Scenario: title`. Requirement and scenario titles become stable slug IDs. It does not infer requirements from arbitrary prose, parse change deltas, or resolve references.

Authoritative references: [OASIS SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html), [GitHub's SARIF-supported subset](https://docs.github.com/en/code-security/reference/code-scanning/sarif-support-for-code-scanning), and [Fission-AI OpenSpec](https://github.com/Fission-AI/OpenSpec).
