# Package security and performance plans

These plans describe the security and performance work identified during the
package audit. Each package plan contains the relevant issues, proposed
implementation steps, and verification work.

The plans describe work remaining after the package-hardening pull request.
An issue is complete only when its implementation, tests, public documentation,
changelog entry, and generated `dst` bundles are updated together. Preserve the
existing public API unless a plan explicitly calls out a migration.

## Plans

- [`roupn`](./roupn/README.md)
- [`staark-common`](./staark-common/README.md)
- [`staark-isomorphic`](./staark-isomorphic/README.md)
- [`staark-patch`](./staark-patch/README.md)
- [`staark`](./staark/README.md)
- [`tiedliene`](./tiedliene/README.md)
- [`vroagn`](./vroagn/README.md)

## Recommended order

1. Finish request concurrency coordination in `vroagn`. This is a contained
   correctness fix and should land before adding optional request behavior.
2. Add resource limits, protocol validation, and secure defaults to `roupn`.
3. Reduce whole-state cloning costs in `tiedliene` after recording a benchmark
   baseline.
4. Benchmark string construction in `staark-isomorphic`.
5. Make the trusted HTML contract configurable in `vroagn`.

## Required verification

For every implementation pull request:

1. Run `npm test` from the workspace root.
2. Run source lint for every changed package.
3. Run each changed package build and commit its tracked `dst` output.
4. Run `git diff --check`.
5. Update the package `README.md` and `CHANGELOG.md` for public behavior or API
   changes.

Performance work must record the runtime, fixture shape, warm-up policy, sample
count, median, and variability. Compare against the merge base rather than a
separately edited copy of the implementation.
