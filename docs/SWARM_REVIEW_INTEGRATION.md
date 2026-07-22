# Swarm-Review integration

Swarm-Review should receive a `RequirementContract` before its review agents run. For every contract criterion, it should emit one `CriterionCoverage` record. The coverage report, not a rendered PR comment, becomes the source of truth.

| Swarm-Review current field | SpecBridge target |
| --- | --- |
| `id` | optional external correlation metadata |
| `claim` | `explanation` |
| `severity` | requirement severity, or reviewer metadata |
| `file`, `line` | `evidence.path`, `evidence.startLine` |
| `confidence` | `confidence` |
| agent name | `reviewer.name` or metadata |

The current public `Finding` schema has no requirement or criterion identifier, so a direct automatic migration is not reliable. A Swarm-Review integration must require agents to select the supplied criterion ID. The fixture in `examples/review-output/coverage.json` is compatible with its published file/line/confidence output shape, but is an integration target rather than a tested upstream change.
