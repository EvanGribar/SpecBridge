# SpecBench retirement readiness

This document is a proposal, not an archive instruction. The old `EvanGribar/SpecBench` repository must remain available until every gate below has evidence and the repository owner explicitly approves retirement.

## Gates

- [ ] `@specbridge/benchmark` and the CLI cover the review, change, validation, fixture, scoring, reporting, experiment, adjudication, and budget-ledger workflows used by the old repository.
- [ ] The consolidated offline suite passes in a clean checkout, including all migrated cases and change tasks.
- [ ] Packed-package smoke tests prove that Core, benchmark, CLI, and the optional live-adapter package can be installed without relying on a missing submodule.
- [ ] At least one reproducible offline run and one reviewed report are published from SpecBridge with provenance linking back to the migrated source material.
- [ ] Package versions, release notes, and migration examples are aligned; consumers no longer depend on `specbridge-bridge` or the old repository for runtime code.
- [ ] Swarm Review has an explicit upstream plan for criterion identifiers and its own offline integration proof.
- [ ] The owner has approved a separate SpecBench PR that replaces the old repository's active instructions with a redirect, preserves historical references, and then archives it through the normal GitHub workflow.

## What is safe now

The consolidation PR can add code, fixtures, docs, and tests to SpecBridge. It must not delete, archive, rewrite, or force-push the SpecBench repository, and it must not change Swarm Review. Existing benchmark result and budget-ledger provenance remains readable.

## Follow-up operation

After the gates pass, prepare a separately reviewed retirement change in SpecBench with a short redirect README, links to `@specbridge/benchmark` and the migration guide, preserved release/result history, and an explicit archive decision. If any gate is not met, keep both repositories available and treat SpecBridge as the forward implementation.
