# Changelog

## Unreleased

- Fix style properties set to `null`, `undefined`, or `false` not being removed. Browsers ignore them as invalid values, so the previous value was kept.
- Support style arrays, which are joined into a list of declarations, and arrays as style values, which are joined with spaces.
- Update a shared suffix of keyed children in place, so inserting or removing children near the start of a list only touches those children.
- Fix memos not re-rendering when their memory, such as a state object, is mutated in place. A copy of the memory is now compared instead.
- Reuse memos rendered in lists. Memos sharing a render function were previously cached as one, so only the last one could be reused. They are now matched by their memory first and their position second.
- Fix proxies being wrapped again when assigned back to the state, for example when sorting or reversing an array, which stacked proxies and triggered an update per layer.
- Compare memo memory that is part of the state through the objects behind the proxies, which avoids going through the proxy.
- Fix the ESM builds in `dst/` being emitted as IIFEs without exports.
- Move only the children outside the longest stable run when reconciling, so removing or swapping keyed items no longer moves every sibling.
- Use a single reconciliation path for keyed and unkeyed children, with an in-place fast path for an unchanged prefix.
- Skip diffing unchanged memo contents instead of cloning and re-diffing them, and allow memos that render nothing.
- Only write attributes, classes, and styles that changed, while keeping `value` in sync with the state. Attributes and classes are compared with the previous render instead of being read back from the DOM.
- Iterate attributes and styles with `for…in` and an own property check instead of allocating key arrays, which roughly halves the time to update a large list.
- Clear removed styles with an empty string instead of `null`.
- Set classes through `setAttribute`, which also works for SVG elements. Object classes no longer have a leading space.
- Dispatch events through one shared listener per mount instead of a wrapper per handler, and skip listeners that did not change.
- Use supplied proxies directly as documented, instead of wrapping them again. State proxies created by `mount` are always recognised, other proxies are detected with `structuredClone`.
- Compare memo memory with the smaller `equalPlain`. Maps, sets, and class instances in memory are now compared by identity, and circular memory always re-renders.
- Reuse existing elements when hydrating, instead of recreating them.
- Declare `sideEffects` so bundlers can tree-shake unused helpers.

## 1.7.17

- Update and improve the `README.md`.
- Document the package API for language models in `llms.txt`.
- Preserve keyed DOM element identity when inserting, removing, or reordering siblings, including keyed nodes returned by memoized views.
- Reduce the minified bundle size of factory, selector, mounting, and state proxy helpers.
- Renamed `AI.md` to `llms.txt`.
- Treat `key` as reconciliation metadata instead of writing it to the DOM.

## 1.7.16

- Migrate tests from Bun to the Node.js test runner.
- Preserve numeric zero values in DOM attributes and style objects.
- Reuse proxies for circular and shared state, leave built-in and custom instances unwrapped, and recover cleanly after rendering errors.
- Apply only own attribute, class, and style properties.

## 1.7.15

- Maintain iframe and media states by using moveBefore where available.
- Switch to `AI.md` for providing library context to LLM's.

## 1.7.14

- Added SVG support.
- Added agent files for working with LLM's.

## 1.7.13

- Fix setting value attribute.

## 1.7.12

- Add additional check in case both attributes and contents are empty.

## 1.7.11

- Small optimisation.

## 1.7.10

- Marked factory methods as pure for improved tree shaking.

## 1.7.9

- Fix issue with duplicate listeners being applied.

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
