# `staark-common` security and performance plan

## Goals

- Make shared recursive utilities safe for cycles and polluted prototypes.
- Preserve shared references where cloning requires them.
- Provide predictable comparison costs and behavior for supported value types.

### Completion criteria

- Recursive utilities terminate for all documented input shapes.
- Inherited enumerable properties are not cloned or interpreted as data.
- Shared references do not cause repeated recursive work.
