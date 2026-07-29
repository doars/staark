# `staark-common` security and performance plan

## Goals

- Make shared recursive utilities safe for cycles and polluted prototypes.
- Preserve shared references where cloning requires them.
- Provide predictable comparison costs and behavior for supported value types.

## Status

The audited clone and equality work is complete. Cycle termination, shared
reference preservation, own-property iteration, pair caching, and supported
built-in handling are implemented and covered by tests. No remaining work from
the current audit is scheduled for this package.

### Completion criteria

- Recursive utilities terminate for all documented input shapes.
- Inherited enumerable properties are not cloned or interpreted as data.
- Shared references do not cause repeated recursive work.
