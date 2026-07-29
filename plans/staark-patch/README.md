# `staark-patch` security and performance plan

## Goals

- Keep reconciliation behavior aligned with `staark`.
- Avoid mutating abstract trees supplied by callers.

## Status

Own-property attribute, class, and style handling is complete. Keyed
reconciliation and avoiding caller-tree mutation are deliberately deferred to
[`MAYBE.md`](../MAYBE.md) and are not part of the remaining implementation
sequence.

### Completion criteria

- Only own attributes, classes, and styles are applied.
