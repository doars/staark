# Changelog

## Unreleased

- Reject prototype-related keys in object-producing parsers and build parser
  dictionaries without prototypes.
- Settle debounced callers through one trailing request and replace animation
  frame concurrency polling with a runtime-neutral FIFO queue.
- Clear timeout resources deterministically and retry thrown network errors.

## Unreleased

- Migrate tests from Bun to the Node.js test runner.
- Return request failures through the documented result tuple and always release concurrency slots.
- Expand request tests for configuration, custom parsers, and error handling.

## 1.4.3

- Switch from TypeScript to JavaScript with JSDocs.

## 1.4.2

- Rewrite from TypeScript to JavaScript.

## 1.4.1

- Using `cloneRecursive` due to performance impact of `structuredClone`.

## 1.4.0

- Removed `cloneRecursive` function in favour of `window.structuredClone` call. Increasing compatibility and reducing build size at the cost of compatibility with browser versions older than three years.

## 1.3.0

- Moved cache function to examples.

## 1.2.0

- Added fetch option to pass custom fetch function.
- Added cached fetch as custom fetch function.

## 1.1.2

- Updated builds.

## 1.1.1

- Partial html content now returns all nodes, not just the first.
- Changed responseParsers option to parsers to match documentation.
- Automatically use tabs as column delimiter for tab separated values.
- Added giving matched type to parser for additional context.

## 1.1.0

- Improved error handling.
- Added support for `maxRequests` option.
- Added support for `retryCodes` option.

## 1.0.0

- Initial release
