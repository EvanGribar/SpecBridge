# Release automation

This repository uses [SemVerge](https://github.com/EvanGribar/semverge) for
independent package versioning and GitHub release publication.

The `packages/*` workspace is intentionally configured as independent. A
package-scoped change should update only the owning package and its release
tag; the test suite runs while SemVerge prepares the release pull request.

