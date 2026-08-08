# Swarm Review integration follow-up

`EvanGribar/Swarm-Review` remains a separate product and repository. This consolidation changes neither its agent execution, debate, GitHub API behavior, nor PR-comment workflow.

SpecBridge already provides an offline `SwarmReviewAdapter` for the documented export shape. For a lossless requirement-level integration, Swarm Review should receive a `RequirementContract` before its agents run and emit one `CriterionCoverage` record for every supplied criterion. The coverage report, rather than a rendered PR comment, should be the machine-readable source of truth.

| Swarm Review field | SpecBridge target |
| --- | --- |
| external finding id | optional correlation metadata |
| `claim` | coverage explanation or finding description |
| `severity` | requirement severity or reviewer metadata |
| `file`, `line` | `evidence.path`, `evidence.startLine` |
| `confidence` | coverage confidence |
| agent name | reviewer metadata |
| explicit criterion id | `requirementId` and canonical criterion reference |

The current public finding shape does not reliably identify a requirement or criterion, so an automatic migration would be ambiguous. The upstream follow-up should:

- add criterion selection to the reviewer prompt and structured output;
- emit the Core `ReviewCoverageReport` shape or a lossless export adapter input;
- retain the existing human-facing finding and PR-comment output;
- run Swarm Review's existing offline validation against the new export;
- update its SpecBridge pin or published dependency only after that proof is complete.

The fixture under `fixtures/specbridge/swarm-review-v1.1.0/` records the current integration provenance and is intentionally an offline compatibility fixture, not a claim about live-model quality.
