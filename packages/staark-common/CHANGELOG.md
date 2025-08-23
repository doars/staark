# Changelog

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
