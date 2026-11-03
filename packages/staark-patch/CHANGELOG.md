# Changelog

## Unreleased

- Fix the ESM builds in `dst/` being emitted as IIFEs without exports.
- Use a single reconciliation path for keyed and unkeyed children, with an in-place fast path for an unchanged prefix, and only move children outside the longest stable run.
- Skip unchanged abstract nodes and stop mutating the previous abstract tree.
- Only write attributes, classes, and styles that changed, while keeping `value` in sync. Attributes and classes are compared with the previous patch instead of being read back from the DOM.
- Iterate attributes and styles with `for…in` and an own property check instead of allocating key arrays, which roughly halves the time to update a large list.
- Clear removed styles with an empty string instead of `null`.
- Set classes through `setAttribute`, which also works for SVG elements. Object classes no longer have a leading space.
- Reuse existing elements when hydrating, and support comments in existing content.
- Declare `sideEffects` so bundlers can tree-shake unused helpers.

## 1.4.13

- Update and improve the `README.md`.
- Document the package API for language models in `llms.txt`.
- Reduce minified bundle size by sharing node creation and update logic.
- Reduce allocations during keyed child reconciliation.
- Preserve keyed DOM element identity when inserting, removing, or reordering siblings.
- Treat `key` as reconciliation metadata instead of writing it to the DOM.

## 1.4.12

- Preserve numeric zero values in DOM attributes and style objects.
- Apply only own attribute, class, and style properties during reconciliation.
- Migrate tests from Bun to the Node.js test runner.

## 1.4.11

- Maintain iframe and media states by using moveBefore where available.

## 1.4.10

- Added SVG support.

## 1.4.9

- Fix setting value attribute.

## 1.4.8

- Add additional check in case both attributes and contents are empty.

## 1.4.7

- Marked factory methods as pure for improved tree shaking.

## 1.4.6

- Fix another bug when setting style property to null.

## 1.4.5

- Fix bug when setting style property to null.
- Switch from TypeScript to JavaScript with JSDocs.

## 1.4.4

- Rewrite from TypeScript to JavaScript.

## 1.4.3

- Update dependencies.

## 1.4.2

- Performance improvements.
- Update dependencies.

## 1.4.1

- Performance improvements.
- Fix bug relating to clearing old styles.

## 1.4.0

- `text` abstract removed.
- `identifier` function added.
- Size and runtime optimisations.

## 1.3.1

- Update `@doars/staark-common` dependency.
- Fix bug when inserting text nodes.

## 1.3.0

- Increased browser compatibility versions of pre-build scripts to major browsers since January 2022.

## 1.2.0

- `match` function added.
- Fix bug when morphing nodes.
- Fix bug when adding new nodes.

## 1.1.0

- `conditional` function added.

## 1.0.1

- Fix in children to node function.

## 1.0.0

- Initial release.
