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

### Resolution

1. Benchmark `set`, `get`, `undo`, and `redo` with representative state sizes
   and history depths.
2. Avoid cloning values more than once while constructing a history entry.
3. Consider storing immutable forward and reverse patches rather than complete
   old and new subtrees.
4. Replace repeated `shift()` calls used to trim history with one `splice()`.
5. Consider an opt-in immutable result or snapshot policy if returning a clone
   from every operation remains too expensive.
6. Document supported state types and whether circular references are allowed.

### Verification

- Add benchmarks for small frequent updates within a large state tree.
- Verify history never exceeds `maximumHistory`.
- Verify mutations to returned state do not affect managed state.
- Verify undo and redo remain exact after optimizing stored patches.

### Completion criteria

- Untrusted diffs cannot reach or modify object prototypes.
- Invalid diffs fail atomically.
- Large-state benchmarks show the effect of each cloning optimization.
