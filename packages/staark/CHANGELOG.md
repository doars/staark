# Changelog

## 1.7.8

- Fix another bug when setting style property to null.

## 1.7.7

- Fix bug when setting style property to null.
- Switch from TypeScript to JavaScript with JSDocs.

## 1.7.6

- Rewrite from TypeScript to JavaScript.

## 1.7.5

- Update dependencies.

## 1.7.4

- Performance improvements.
- Bundle size reduced.
- Update dependencies.

## 1.7.3

- Performance improvements.
- Removed console log.
- Update dependencies.

## 1.7.2

- Fix bug in event listener handling.

## 1.7.1

- Update function now returns a promise that resolves after rendering.
- Performance improvements.
- Fix bug relating to clearing old styles.

## 1.7.0

- Update `@doars/staark-common` dependency.
- `identifier` function added.
- Provide state to listener callbacks.
- Fixed memoization issue.
- Size and runtime optimisations.

## 1.6.1

- Update `@doars/staark-common` dependency.
- Fix bug when inserting text nodes.

## 1.6.0

- Removed `@doars/staark-common`'s `cloneRecursive` function dependency in favour of `window.structuredClone` call. Increasing compatibility and reducing build size at the cost of compatibility with browser versions older than three years.
- Switched from using `requestAnimationFrame` call to delay re-rendering to `Promise.resolve().then`. This decreases the wait time at the risk that a promise resolves after the re-rendering causing another. Because only promises that are scheduled to resolve after the first mutation to the state has happened can cause this the chance of this is deemed small enough to try this out.

## 1.5.0

- `match` function added.
- Fix bug when morphing nodes.

## 1.4.0

- `conditional` function added.
- Fix bug when adding new nodes.

## 1.3.8

- Fix in children to node function.

## 1.3.7

- Fix internal updating of abstract node tree.
- Added parameter for providing existing abstract node tree.
- Automatically parse the initial state and existing abstract node tree from JSON if they are string.
- Instead of removing child nodes of the provided root node it generates the abstract node tree for it.

## 1.3.6

- Improved types of NodeAttributes.

## 1.3.5

- Fixed bug causing DOM and virtual DOM differences.
- Removed calls to the DOM for checking the state.

## 1.3.4

- Fixed bug causing DOM and virtual DOM differences.

## 1.3.3

- Update builds.

## 1.3.2

- Fix bug when updating style attribute.

## 1.3.1

- Improved handling when no valid root node is given.

## 1.3.0

- ?

## 1.2.0

- Added support for initial state being an existing proxy.

## 1.1.1

- Fixed issue when node has no child elements.

## 1.1.0

- Added app's state proxy as the third value returned by the mount function.

## 1.0.0

- Initial release.
