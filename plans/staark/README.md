# `staark` security and performance plan

## Goals

- Support shared and circular state graphs safely, or reject them clearly.
- Preserve current DOM and state-update behavior while optimizing hot paths.

## Status

The audited proxy, lifecycle, and own-property hardening is complete. Keyed
reconciliation is deliberately deferred to [`MAYBE.md`](../MAYBE.md) and is not
part of the remaining implementation sequence.

### Completion criteria

- Shared and circular state graphs do not recurse indefinitely.
- Failed renders cannot permanently disable future updates.
- Only own attribute, class, and style properties are applied.
