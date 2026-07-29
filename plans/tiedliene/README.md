# `tiedliene` security and performance plan

## Goals

- Make diffs safe to apply when their contents came from an untrusted source.
- Prevent excessive cloning and history-management costs for large states.
- Define behavior for circular and non-plain state values.

## Issue 1: Whole-state cloning and repeated subtree cloning

**Priority:** Medium

`manageState` clones complete state values for reads and state transitions.
Diff generation also clones changed subtrees, producing high allocation and
garbage-collection pressure.

The repeated history `shift()` calls have already been replaced with one
`splice()`. Cycle-safe cloning and diff generation are also implemented. The
remaining work is measurement, clone elimination, and API documentation.

### Resolution

1. Add a benchmark fixture with a large stable tree and small leaf updates. Run
   `set`, `get`, `undo`, and `redo` separately at multiple state sizes and
   history depths; report time and allocated heap where supported.
2. Add instrumentation around `cloneRecursive` or an injectable clone function
   to count full-state and subtree clones per operation before optimizing.
3. Avoid cloning the incoming state both before diffing and again while storing
   changed values. A history entry must own immutable forward and reverse data
   so later caller mutations cannot rewrite history.
4. Prefer forward and reverse patches containing only changed paths over full
   old/new snapshots. Define array insertion and deletion ordering so patches
   remain exactly reversible.
5. Keep defensive cloning as the default. If benchmarks show `get()` cloning
   dominates, add an explicit `snapshot: 'clone' | 'reference'` policy;
   document `reference` as an opt-in immutable-use contract and reject unknown
   policy values.
6. Validate `maximumHistory` as a non-negative integer and define `0` as history
   disabled. Bound both stacks after every operation.
7. Document supported values: cycles and shared references are preserved.
   Treat `Date`, `Map`, `Set`, and typed arrays as atomic values: compare them
   using their documented value semantics and store one whole-value `set`
   change when unequal. Reject custom instances, functions, weak collections,
   DOM nodes, symbol-keyed state, and enumerable accessors with a stable
   `TypeError` before changing managed state.

### Verification

- Add benchmarks for small frequent updates within a large state tree.
- Verify history never exceeds `maximumHistory`.
- Verify mutations to returned state do not affect managed state.
- Verify undo and redo remain exact after optimizing stored patches.
- Verify mutation of initial, assigned, returned, and historically retained
  values cannot alter managed state or history under the default policy.
- Add cycle/shared-reference undo and redo cases and cases for every documented
  built-in value.

### Completion criteria

- Untrusted diffs cannot reach or modify object prototypes.
- Invalid diffs fail atomically.
- Large-state benchmarks show the effect of each cloning optimization.
- Default API isolation and exact undo/redo behavior remain backward compatible.
