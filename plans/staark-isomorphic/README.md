# `staark-isomorphic` security and performance plan

## Goals

- Ensure server-rendered HTML cannot be changed by untrusted text or attribute
  values.
- Keep rendering behavior consistent between `stringify` and `stringifyPatch`.
- Avoid introducing unnecessary allocations in the escaping path.

## Issue 1: Repeated string concatenation for large trees

**Priority:** Low

Recursive rendering repeatedly appends to a string. Modern engines optimize
many of these operations, so this should be measured before changing it.

### Resolution

1. Add benchmarks for broad and deeply nested abstract trees.
2. Compare the current approach with collecting fragments in an array and
   joining once.
3. Keep the current implementation unless benchmarks show a meaningful and
   repeatable improvement.

### Completion criteria

- All dynamic text and attribute output is contextually escaped.
- Both public stringify paths share the same security behavior.
- Security regression tests cover the relevant HTML contexts.
