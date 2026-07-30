# Changelog

## Unreleased

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
