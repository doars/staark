# Changelog

## Unreleased

- Treat only `null`, `undefined`, and `false` as no contents in `node`, `arrayify`, and `arrayifyOrUndefined`, so zero and empty strings are kept.
- Avoid creating a closure per call in `equalPlain`.
- Only allocate the comparison cache in `equalRecursive` when comparing objects.
- Support comment nodes in `childrenToNodes`, and use `localName` so element types match lowercase abstract nodes. HTML element types are now lowercase.
- Add `equalPlain`, a smaller comparison for plain data that does not allocate key arrays, and `clonePlain` to copy plain data for it.
- Add `attributeToString`, used to convert attribute values to the strings written to the DOM, and `styleValueToString` and `styleToString` for style values and objects.
- Add `increasingSubsequence`, used to minimise DOM moves when reconciling children.
- Declare `sideEffects` so bundlers can tree-shake unused helpers.

## 1.5.10

- Update and improve the `README.md`.
- Document the package API for language models in `llms.txt`.
- Reduce minified bundle size by sharing element type conversion and simplifying selector parser state.

## 1.5.9

- Fix cloning `null` type.
- Fix parsing content after IDs (`#`).
- Migrate tests from Bun to the Node.js test runner.
- Preserve cycles and shared references in recursive clones, ignore inherited properties, safely clone `DataView` values, and compare binary views by their visible bytes.

## 1.5.8

- Removed uppercasing tag names by default.

## 1.5.7

- Add additional check in case both attributes and contents are empty.

## 1.5.6

- Marked factory methods as pure for improved tree shaking.

## 1.5.5

- Switch from TypeScript to JavaScript with JSDocs.

## 1.5.4

- Rewrite from TypeScript to JavaScript.

## 1.5.3

- Allow fallback parameters of match function to be a function.

## 1.5.2

- Added optional fallback parameter to match function.

## 1.5.1

- Performance improvements.
- Added `arrifyOrUndefined` function.

## 1.5.0

- `text` abstract removed.
- `identifier` function added.
- Size and runtime optimisations.

## 1.4.2

- Allow `conditional` and `match` to be given function that resolve to nodes.

## 1.4.1

- Added deprecation message to `cloneRecursive` function. Use `window.structuredClone` instead.

## 1.4.0

- `match` function added.

## 1.3.0

- `conditional` function added.

## 1.2.2

- Fix in children to node function.

## 1.2.1

- Optimize build size.

## 1.2.0

- Added virtual node functions.
- Added elementToNode function.
- Re-added selectorToTokenizer function.
- Removed onCreated function.

## 1.1.0

- Added build of library.
- Added onCreated function.
- Added uniqueIdentifier function.
- Added suffixNameIfMultiple function.
- Removed generic type definitions.
- Removed selector paring function.

## 1.0.1

- Marked generic object functions as deprecated.

## 1.0.0

- Initial release.
