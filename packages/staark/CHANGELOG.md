# Changelog

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
