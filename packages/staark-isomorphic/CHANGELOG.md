# Changelog

## Unreleased

- Fix `false` attributes being rendered, for example `hidden="false"`, which hid the element and was kept after hydration.
- Fix keys and event listeners being written to the HTML, including the listener's source code.
- Fix memos whose memory is falsy rendering as `[object Object]`.
- Stop padding text with spaces, which changed the spacing of inline content.
- Return and serialize the tree normalized to match the DOM a browser parses from the HTML: memos are replaced by their contents, adjacent text is merged, and empty text is left out. Hydrating now reuses the server-rendered elements, including those rendered by memos.
- Leave out `undefined` values and functions when serializing the tree, like JSON.
- Share attribute and style conversion with the DOM renderers. Style objects leave out `null`, `undefined`, and `false` values.
- Render `area`, `col`, `embed`, `param`, and `track` without a closing tag.
- Lowercase element types without depending on the locale.

## 1.6.10

- Update and improve the `README.md`.
- Document the package API for language models in `llms.txt`.

## 1.6.9

- Add deterministic concatenation-versus-fragment rendering benchmarks and retain concatenation after it won every measured fixture with lower memory.
- Escape server-rendered text and attribute values, validate emitted names, and use one renderer for `stringify` and `stringifyPatch`.
- Migrate tests from Bun to the Node.js test runner.
- Fix invalid abstract tree JSON returned by full stringification functions.

## 1.6.8

- Upgrade dependency.

## 1.6.7

- Add additional check in case both attributes and contents are empty.

## 1.6.6

- Marked factory methods as pure for improved tree shaking.

## 1.6.5

- Switch from TypeScript to JavaScript with JSDocs.

## 1.6.4

- Rewrite from TypeScript to JavaScript.

## 1.6.3

- Update dependencies.

## 1.6.2

- Update dependencies.

## 1.6.1

- Performance improvements.

## 1.6.0

- `text` abstract removed.
- `identifier` function added.

## 1.5.1

- Update `@doars/staark-common` dependency.

## 1.5.0

- Increased browser compatibility versions of pre-build scripts to major browsers since January 2022.

## 1.4.0

- `match` function added.

## 1.3.0

- `conditional` function added.

## 1.2.0

- Added `stringifyPatch` and `stringifyPatchFull` functions.
- Added re-hydration examples.

## 1.1.1

- Included `stringifyFull` function into iife build.

## 1.1.0

- Added documentation.
- Added memo node, will be ignored when rendering.
- Changed to export `@doars/staark` internals instead of duplicating the same code in this library.

## 1.0.0

- Initial release
