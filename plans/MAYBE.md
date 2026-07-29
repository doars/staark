# Maybe

Possible plans to look at in the future.

These items are explicitly deferred and are not completion requirements for
the remaining work in [`README.md`](./README.md). Promoting either item requires
a public key representation decision and a separate compatibility review.

## staark: Quadratic sibling reconciliation

**Priority:** Medium

For each new child, reconciliation scans the remaining old children and mutates
the old abstract array with `splice()`. Large reordered sibling lists can require
quadratic comparisons and array movement.

### Resolution

1. Add an optional stable key to node abstracts and document key uniqueness
   among siblings.
2. Build a key-to-old-index map once per child list when keys are present.
3. Reuse unkeyed nodes positionally with a bounded fallback rather than scanning
   the complete remainder for every node.
4. Avoid mutating the caller's old abstract tree during matching.
5. Share the reconciliation strategy with `staark-patch` so both packages retain
   equivalent behavior.

### Verification

- Add tests for prepend, append, reverse, arbitrary reorder, insertion, removal,
  duplicate keys, and mixed keyed/unkeyed children.
- Verify input abstract trees are not mutated unexpectedly.
- Benchmark 100, 1,000, and 10,000 sibling updates.
- Track DOM creations, removals, and moves to ensure optimization does not cause
  more DOM work.

## staark-patch: Quadratic sibling reconciliation

**Priority:** Medium

For each new child, the patcher scans the remaining old children and uses nested
`splice()` calls when moving a match. Reordered sibling lists can require O(n²)
work.

### Resolution

1. Adopt the same stable node-key representation planned for `staark`.
2. Build an old-key lookup once for each sibling list.
3. Use positional matching for unkeyed children and reserve scanning for a
   bounded compatibility fallback.
4. Track used old nodes separately rather than splicing the old abstract tree.
5. Extract shared reconciliation helpers into `staark-common` only if doing so
   does not increase bundle size or couple browser DOM operations to common data
   utilities.

### Verification

- Run the same reorder, insertion, deletion, duplicate-key, and mixed-child test
  matrix as `staark`.
- Verify event listeners and form values remain associated with the intended DOM
  nodes after moves.
- Benchmark broad lists at several sizes and compare DOM operation counts.
