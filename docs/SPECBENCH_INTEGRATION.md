# SpecBench integration

SpecBench ingests `coverage.json` as an adapter input and remains the scorer. Map each benchmark `ExpectedFinding.requirementReference` to a SpecBridge `criterionId`; treat a violated criterion as a candidate finding and use its evidence for the file/line match. Do not score `satisfied`, `not_verifiable`, or `not_applicable` records as findings.

| SpecBench current field | SpecBridge field |
| --- | --- |
| `expectedFindings[].id` | benchmark mapping metadata |
| `requirementReference` | `criterionId` |
| `file`, `startLine`, `endLine` | evidence location |
| `severity` | requirement severity |
| reviewer finding | violated criterion |

Criterion-level scoring is appropriate only after benchmark cases establish a stable mapping. Existing SpecBench matching, adjudication, precision, recall, and F1 remain unchanged. Its published `swarm-review-export.json` lacks requirement references, so it cannot be losslessly converted without an explicit mapping.
