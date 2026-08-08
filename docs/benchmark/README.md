# SpecBridge benchmark guide

The benchmark material in this directory was consolidated from SpecBench. It is retained as versioned methodology and provenance documentation; the executable implementation is in `@specbridge/benchmark` and the CLI is `specbridge bench`.

## Evidence hierarchy

1. Case definitions and controlled reference repositories under `benchmarks/`.
2. Reviewer outputs and normalized findings under `fixtures/` or `results/`.
3. Deterministic scorer output from `specbridge bench score`.
4. Static report output from `specbridge bench report`.
5. Human adjudication records, kept separate from automatic scores.

The `reference-saas-v0.1` and `reference-saas-v0.2` values in migrated case files are historical baseline labels. A source checkout validates them when the corresponding Git ref is present; packed/source-archive consumers still validate patch paths and finding references, while arbitrary unresolved baseline refs fail closed.

## Common commands

```bash
specbridge bench validate --benchmark v0.2
specbridge bench list --benchmark v0.2
specbridge bench review --reviewer json-file --fixture perfect
specbridge bench score --results results/benchmarks/run.json
specbridge bench report --results results/benchmarks/run.json
specbridge bench experiment --config experiments/v0.3/single-agent.json --dry-run
```

Change-mode tasks are validated and executed separately:

```bash
specbridge bench change validate --task tasks/change/authorization.yml
specbridge bench change run --task tasks/change/authorization.yml --agent mock
```

## Interpretation

These cases test adherence to explicit requirements in controlled patches. They do not establish general code-review, security, or model-quality claims. Keep raw outputs, configuration, benchmark version, runtime/cost metadata, and fixture provenance with any published result.

The live v0.3 smoke workflow is opt-in, budgeted, and provider-dependent. `--dry-run` is the safe default for planning and CI validation.
