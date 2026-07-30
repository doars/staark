# tiedliene

tiedliene is a teensy-tiny yet powerful state management utility designed to keep your application state consistent and manageable. With a focus on simplicity and efficiency, tiedliene enables you to track, apply, revert, and even manage undo/redo operations for state changes. It's perfect for applications that require precise control over state transitions without the overhead of more complex libraries.

- Offers a simple set of functions, making it **easy to understand** and integrate into your application.
- Comes in at **less than a kilobyte and a half** in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Uses an **naive diffing algorithm** to ensure that state changes are applied in full.
- Allows you to not only revert state changes but also provides built-in **undo and redo** capabilities.

To start using tiedliene, you need to understand the core functions: `determineDiff`, `applyDiff`, `revertDiff`. These functions allow you to calculate the differences between states, apply those changes, revert to previous states.

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
  path: ['interests', '2', ],
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
  path: ['interests', '2', ],
  new: 'Meditation',
}]

const originalState = revertDiff(currentState, diffs)
console.log(originalState)
```

In this example, `revertDiff` undoes the changes specified in the diffs, restoring the state to its previous condition.

All the functionality above is part of the base library there is an expanded version which has a bit more non-essential functionality to make development simpler. The full build has in addition to determining, apply, and reverting changes also support for state management via the `manageState` function. This method does not only tracks state changes but also provides undo and redo functionality. This method encapsulates your state, allowing you to `get`, `set`, `undo`, and `redo` state changes efficiently.

- Use `get()` to retrieve the current state.
- The `set(newState)` method updates the state and pushes the changes to the undo stack. If you set a new state, the redo stack is cleared.
- The `undo()` method reverts the state to its previous version by popping the last set of diffs from the undo stack and applying them in reverse. These diffs are then pushed onto the redo stack.
- The `redo()` method reapplies the most recent undo by popping diffs from the redo stack and applying them, pushing them back onto the undo stack.

These methods makes it easy to implement undo and redo functionality in your application, keeping the history of state changes, and allowing users to navigate through past states.

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

Plain objects and arrays may contain cycles and shared references, which are
preserved. `Date`, `Map`, `Set`, and typed-array values are compared by value
and stored as whole atomic changes. Functions, custom instances, weak
collections, DOM nodes, symbol-keyed state, and enumerable accessors are
rejected with `TypeError` before managed state changes.

Run `npm run benchmark --workspace=packages/tiedliene` to measure `set`, `get`,
`undo`, and `redo` across the included stable-tree sizes and history limits.
The fixture sizes are 100, 1,000, and 5,000 records with one changing leaf;
history limits are 0, 10, and 50. Each operation receives 20 warm-ups and 50
samples. On Node.js 26.5.0, the 5,000-record/history-10 fixture measured medians
of 19.17 ms for `set`, 2.11 ms for `get`, 2.09 ms for `undo`, and 2.05 ms for
`redo`. Median snapshot heap deltas were about 1.97 MB; `set` heap deltas are
GC-sensitive and are reported without treating negative samples as allocations.
Clone instrumentation recorded 351 full snapshot clones for the complete
fixture run. State assignment itself no longer performs a second full incoming
clone; immutable forward/reverse patch values own changed data.

tiedliene's functions are versatile and can be used with nested objects, arrays, or even custom objects like Proxies. The diffing, applying, and reverting mechanisms handle these cases smoothly, ensuring your state transitions are consistent and predictable.

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
