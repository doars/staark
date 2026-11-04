# Changelog

## Unreleased

- Emit the changes of `determineDiff` in apply order, with array indices as numbers, and revert them from last to first as documented. Hand-written diffs now revert correctly.
- Fix large diffs throwing a `RangeError`, and make diffs with many changes much faster.
- Give a shared object its own copy where a diff would split it, instead of changing both paths.
- Record a change from an object to an array, or the other way around. Roots of different kinds throw a `TypeError`.
- Compare objects and arrays inside Maps and Sets, and fix Maps and Sets that contain themselves overflowing the stack.
- Restore values that were really `undefined` on revert, insert array items back when reverting a delete, and keep the holes in sparse arrays in place.
- Only update the undo and redo history once a change has been applied, so a failed `set`, `undo` or `redo` leaves it unchanged.
- Reject `__proto__`, `constructor` and `prototype` keys in managed state, and own `__proto__` keys when cloning or diffing.
- Skip the trial run on a copy when undoing or redoing with cloned snapshots.
- Time cold runs and large diffs in the benchmarks.
- Update the documentation to match the code.

## 1.3.1

- Update and improve the `README.md`.
- Document the package API for language models in `llms.txt`.

## 1.3.0

- Store state transitions as changed-path patches instead of replacing state with a second full incoming clone.
- Add validated `maximumHistory`, `snapshot`, and clone-instrumentation options.
- Compare `Date`, `Map`, `Set`, and typed arrays atomically and reject unsupported managed-state values before mutation.
- Add deterministic large-stable-tree state benchmarks.
- Validate diff paths before applying them, reject prototype-related keys, and make invalid diffs fail atomically.
- Preserve cycles and shared references when cloning own enumerable values.
- Fix cloning `null` type.
- Migrate tests from Bun to the Node.js test runner.
- Expand state management tests for cloning, history, undo, and redo behavior.

## 1.2.0

- Added `cloneRecursive` to library exports.

## 1.1.3

- Switch from TypeScript to JavaScript with JSDocs.

## 1.1.2

- Rewrite from TypeScript to JavaScript.

## 1.1.1

- Using `cloneRecursive` due to performance impact of `structuredClone`.

## 1.1.0

- Removed `@doars/staark-common`'s `cloneRecursive` function dependency in favour of `window.structuredClone` call. Increasing compatibility and reducing build size at the cost of compatibility with browser versions older than three years.

## 1.0.0

- Initial release.
