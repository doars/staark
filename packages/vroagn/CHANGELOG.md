# Changelog

## 1.6.0

- Fix a queued request hanging forever when another request with the same abort signal was aborted.
- Send the documented `priority` option to fetch.
- Add `queryParams` with `&` when the path already has a query, keep a `#fragment` at the end, and don't leave a trailing `?` when there are no parameters.
- Merge instance and per-call headers with the `Headers` class, so `Headers` instances are no longer dropped, and read the Accept header case-insensitively.
- Only encode plain objects and arrays as JSON, and give them `Content-Type: application/json` when no content type is set. Strings, `FormData`, `Blob`, `URLSearchParams` and buffers are sent unchanged.
- Give errors for failed responses a message when the status text is empty, as it always is over HTTP/2, and attach `status` and `response` to them.
- Ignore a URL fragment when reading the file extension.
- End the `delay`, `throttle` and retry waits as soon as the request is aborted or times out.
- Cancel the body of a failed response before retrying, so its connection is released.
- Stop passing internal `perCall*` keys to custom parsers.
- Fix CSV with CRLF line endings, and keep an empty last field.
- Fix TOML multi-line strings, keep quoted values in inline tables as strings, strip trailing comments, and throw on a key without a value.
- Rewrite the YAML parser, adding plain lists, block scalars with chomping indicators, anchors on mappings and lists, merge keys, and trailing comments. Lines it doesn't understand now throw a `SyntaxError` instead of being skipped. The unused `indentSize` option is removed.
- Only cache GET requests in the cache example.
- Update the documentation to match the code.

## 1.5.1

- Update and improve the `README.md`.
- Document the package API for language models in `llms.txt`.

## 1.5.0

- Parse single-line and multiline TOML arrays without losing their owning key.
- Preserve blank lines in YAML block values and safely skip blank lines between
  nested mappings.
- Coordinate limited and unlimited requests through one strict FIFO scheduler,
  including completion and queued-abort draining.
- Add `createTrustedHTML` and `trustedTypesPolicy` HTML parsing options with
  initial and per-call precedence.
- Preserve platform objects such as `AbortController` while cloning request
  option records.
- Reject prototype-related keys in object-producing parsers and build parser
  dictionaries without prototypes.
- Settle debounced callers through one trailing request and replace animation
  frame concurrency polling with a runtime-neutral FIFO queue.
- Clear timeout resources deterministically and retry thrown network errors.
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
