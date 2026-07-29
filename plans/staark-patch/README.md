# `staark-patch` security and performance plan

## Goals

- Keep reconciliation behavior aligned with `staark`.
- Avoid mutating abstract trees supplied by callers.

### Completion criteria

- Reconciliation avoids quadratic lookup for keyed lists.
- Input abstract trees remain unchanged after patching.
- Only own attributes, classes, and styles are applied.
