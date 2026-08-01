# tiedliene

tiedliene is a teensy-tiny yet powerful state management utility designed to keep your application state consistent and manageable. With a focus on simplicity and efficiency, tiedliene enables you to track, apply, revert, and even manage undo/redo operations for state changes. It's perfect for applications that require precise control over state transitions without the overhead of more complex libraries.

- Offers a simple set of functions, making it **easy to understand** and integrate into your application.
- Comes in at **less than a kilobyte and a half** in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Uses a **naive diffing algorithm** to ensure that state changes are applied in full.
- Allows you to not only revert state changes but also provides built-in **undo and redo** capabilities.

To start using tiedliene, you need to understand three core functions: `determineDiff`, `applyDiff`, and `revertDiff`. These calculate the differences between states, apply those changes, and revert them.

A diff contains `set` and `delete` changes. Each change has a non-empty path made from string keys or numeric array indices. Unsafe path components such as `__proto__`, `constructor`, and `prototype` are rejected.

The `determineDiff` function is the cornerstone of tiedliene. It takes two states—an original state and a modified state—and returns a list of changes (diffs) that describe how to transform the original state into the modified state.

```JavaScript
import { determineDiff } from '@doars/tiedliene'

const oldState = {
  name: 'Luke',
  age: 22,
  interests: ['Jedi Training', 'Flying', ],
}

const newState = {
  name: 'Luke',
  age: 23,
  interests: ['Jedi Training', 'Flying', 'Meditation', ],
}

const diffs = determineDiff(oldState, newState)
console.log(diffs)
```

In the example above, `determineDiff` compares `oldState` and `newState`, outputting a list of changes that reflect the transition from the old state to the new one.

Once you've determined the diffs, use `applyDiff` to apply these changes to an existing state. This function updates the current state based on the provided diffs.

```JavaScript
import { applyDiff } from '@doars/tiedliene'

let state = {
  name: 'Luke',
  age: 22,
  interests: ['Jedi Training', 'Flying', ],
}

const diffs = [{
  type: 'set',
  path: ['age'],
  old: 22,
  new: 23,
}, {
  type: 'set',
  path: ['interests', 2, ],
  new: 'Meditation',
}]

state = applyDiff(state, diffs)
console.log(state)
```

Here, `applyDiff` modifies the `state` according to the diffs, updating it to reflect the new values.

With the `revertDiff` function, you can undo changes made to the state. This is particularly useful for implementing features like "undo" or "rollback" in your application.

```JavaScript
import { revertDiff } from '@doars/tiedliene'

const currentState = {
  name: 'Luke',
  age: 23,
  interests: ['Jedi Training', 'Flying', 'Meditation', ],
}

const diffs = [{
  type: 'set',
  path: ['age'],
  old: 22,
  new: 23,
}, {
  type: 'set',
  path: ['interests', 2, ],
  new: 'Meditation',
}]

const originalState = revertDiff(currentState, diffs)
console.log(originalState)
```

In this example, `revertDiff` undoes the changes specified in the diffs, restoring the state to its previous condition.

All the functionality above is part of the base library. The full build adds a little non-essential functionality to make development simpler, including state management through `manageState`. This method tracks changes and provides undo and redo while keeping the state encapsulated behind `get`, `set`, `undo`, and `redo`.

- Use `get()` to retrieve the current state.
- The `set(newState)` method updates the state, pushes changes to the undo stack, clears the redo stack, and returns the new snapshot.
- The `undo()` method reverts the latest change, moves it to the redo stack, and returns the resulting snapshot.
- The `redo()` method reapplies the latest undone change, moves it back to the undo stack, and returns the resulting snapshot.

These methods make it easy to add undo and redo to an application, keeping the history of state changes and allowing users to navigate through past states.

```JavaScript
import { manageState } from '@doars/tiedliene'

const initialState = {
  name: 'Luke',
  age: 22,
  interests: ['Jedi Training', 'Flying', ],
}

const stateManager = manageState(initialState)

// Get the current state.
console.log(stateManager.get())

// Set a new state.
stateManager.set({
  name: 'Luke',
  age: 23,
  interests: ['Jedi Training', 'Flying', 'Meditation', ],
})

// Undo the last change.
stateManager.undo()
console.log(stateManager.get())

// Redo the last undone change.
stateManager.redo()
console.log(stateManager.get())
```

`manageState` accepts these options:

- `maximumHistory` is a non-negative integer. Its default is `50`; `0` disables history.
- `snapshot` is either `'clone'` (the defensive default) or `'reference'`. Reference snapshots expose managed state directly and require callers to treat it as immutable unless they intentionally want to mutate the manager state.
- `clone` is an optional clone function used for snapshots and instrumentation.

Plain objects and arrays may contain cycles and shared references, which are preserved. `Date`, `Map`, `Set`, and typed-array values are compared by value and stored as whole atomic changes. Functions, custom instances, weak collections, DOM nodes, symbol-keyed state, and enumerable accessors are rejected with `TypeError` before managed state changes.

tiedliene's diff functions work with nested plain objects and arrays, including cycles and shared references. `manageState` deliberately rejects functions, custom instances, weak collections, DOM nodes, symbol-keyed state, and enumerable accessors so managed transitions remain predictable.

```JavaScript
const nestedState = {
  user: {
    name: 'Luke',
    profile: {
      age: 22,
      interests: ['Jedi Training', 'Flying', ],
    },
  },
}
```

## Installation

Via NPM

```ZSH
npm install @doars/tiedliene
```

IIFE build via a CDN

```HTML
<!-- Base bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.base.iife.js"></script>
<!-- Base bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.base.iife.min.js"></script>
<!-- Full bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.iife.js"></script>
<!-- Full bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.iife.min.js"></script>
```

ESM build via a CDN

```JavaScript
// Base bundle.
import { determineDiff } from 'https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.base.js'
// Base bundle minified.
import { determineDiff } from 'https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.base.min.js'
// Full bundle.
import { determineDiff, manageState } from 'https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.js'
// Full bundle minified.
import { determineDiff, manageState } from 'https://cdn.jsdelivr.net/npm/@doars/tiedliene@1/dst/tiedliene.min.js'
```

For compact language-model documentation, see [`llms.txt`](./llms.txt).
