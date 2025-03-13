# Staark

### Types

```TypeScript
export type NodeContent =
  string |
  MemoAbstract |
  NodeAbstract

type ResolveFunction = () => NodeAbstract[] | NodeAbstract | null | undefined
```

## Base functions

### `mount`

Signature:
```TypeScript
mount(
  rootNode: Element | string,
  renderView: (state: any) => NodeContent[] | NodeContent,
  initialState?: any,
  oldAbstractTree?: NodeContent[] | NodeContent | string,
): [update: () => void, unmount: () => void, state?: any]
```

Behaviour: Attaches the application to a given DOM node.

Parameters:
- `rootNode` the element to attach he application to, if a string is used it will be used as a query selector.
- `renderView` a function which receives the current state and returns an abstract node tree.
- `initialState` can be an object or a recursive proxy; if a proxy is used, manual triggering of re-renders via update is expected.
- `oldAbstractTree` is used for isomorphic / server-side rendering. If provided as a string, it will be parsed as JSON.

Returns a tuple:
  1. update: Function to force a re-render.
  2. unmount: Function to remove the application from the DOM.
  3. state: The state proxy used within the app.

### `node` (Alias: n)

Signature:
```TypeScript
node(
  type: string,
  attributes?: { [key: string]: any },
  children?: (NodeContent | string)[] | NodeContent | string,
): NodeAbstract
```

Behaviour: Creates an abstract representation of a DOM node.

Parameters:
- type: A string indicating the node type (e.g., 'div', 'span').
- attributes: An object containing attributes. Special handling:
  - Functions: Added as event listeners.
  - `class`: A string, list or object with class names.
  - `style`: A string or an object with style properties.
- children: Child nodes or primitive values such as a string.

Returns: An abstract node used for subsequent diffing and DOM rendering.

#### `attributes` explained

Event listeners:
- When an attribute's value is a function, it is automatically registered as an event listener.
- For consistent behaviour, define event listener functions outside of the view function to avoid identity changes between renders.

`class` attribute:
- Can be a string.
- Can also be provided as an array of class names.
- Can also be provided as an object, keys with truthy values are concatenated.

`style` attribute:
- Can be a string.
- Can be provided as an object with CSS properties.
- Keys in camelCase are automatically converted to kebab-case.
- The object is converted into a valid inline CSS string.

### `memo`

Signature:
```TypeScript
memo(
  view: (state: any) => NodeContent[] | NodeContent,
  condition: any,
): MemoAbstract
```

Behaviour: Memoizes the result of a view function based on a condition. The memoized view is recalculated only when the condition value changes.

Parameters:
- The `view` function receives the current state and returns an abstract node tree (using node or its variants).
- `condition` any value that if changed will cause the view function to be called again.

Return: A memo abstract used for subsequent diffing and DOM rendering.

Note:
- Define the memoized view function outside of the parent view function to maintain a stable identity.
- Nested use of memo is discouraged due to cache clearing after updates.

## Helper functions

The helper functions are not included in the base library, only in the full library.

### `conditional`

Signature:
```TypeScript
conditional(
  condition: any,
  onTruth: NodeContent[] | NodeContent | ResolveFunction,
  onFalse?: NodeContent[] | NodeContent | ResolveFunction,
): NodeContent[]
```

Behaviour: Evaluates a condition and returns an array containing either `onTrue` (when true) or `onFalse` (when false).

Parameters:
- `condition` any value that will be checked for being truthy.
- `onTrue` data to return when the condition is truthy.
- `onFalse` data to return when the condition is falsy.

Returns: an array, suitable for spreading into an abstract node tree.

### `match`

Signature:
```TypeScript
match(
  key: string,
  lookup: { [key: string]: NodeContent[] | NodeContent | ResolveFunction },
  fallback?: NodeContent[] | NodeContent | ResolveFunction,
): NodeContent[]
```

Behaviour:
- Matches the provided key against an object of cases.
- Case values may be functions; they are evaluated when selected.

- `key` any value that will be checked for being in the lookup table.
- `lookup` the lookup table through which is looked for a match.
- `fallback` the data to return if no match is found.

Returns: the corresponding value as an array, suitable for spreading into an abstract node tree.

## Alternative abstract creation

### `nde`

Signature:
```TypeScript
nde(
  query: string,
  children?: any[],
): NodeAbstract
```

Behaviour: Creates an abstract node using a query selector syntax.

Example:
```JavaScript
nde('a.nav-link.active[href="/next-page/"][target=_blank]', 'Next page')
```

### `factory`

Behaviour: A object acting as a factory pattern that wraps the `node` function for easy node generation using specific types. Eliminating the need to pass the node type as a string in every call.

Example:
```JavaScript
const { div, span, button } = factory
// Now `div([...])` is equivalent to `node('div', [...])`
```

### `fctory`

Behaviour: Combines the functionality of `factory` and `nde`. Provides pre-bound functions for node types that accept query selector strings for attributes.

Example:
```JavaScript
const { a } = fctory;
// Now `a('.nav-link.active[href="/next-page/"][target=_blank]', 'Next page')` creates an anchor node.
```
