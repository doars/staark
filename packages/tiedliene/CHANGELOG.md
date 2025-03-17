# Changelog

## 1.1.2

- Rewrite from TypeScript to JavaScript.

## 1.1.1

- Using `cloneRecursive` due to performance impact of `structuredClone`.

## 1.1.0

- Removed `@doars/staark-common`'s `cloneRecursive` function dependency in favour of `window.structuredClone` call. Increasing compatibility and reducing build size at the cost of compatibility with browser versions older than three years.

## 1.0.0

- Initial release.
