# `staark` security and performance plan

## Goals

- Support shared and circular state graphs safely, or reject them clearly.
- Preserve current DOM and state-update behavior while optimizing hot paths.

### Completion criteria

- Keyed list updates avoid quadratic lookup behavior.
- Shared and circular state graphs do not recurse indefinitely.
- Failed renders cannot permanently disable future updates.
