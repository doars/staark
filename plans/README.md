# Package security and performance plans

These plans describe the security and performance work identified during the
package audit. Each package plan contains the relevant issues, proposed
implementation steps, and verification work.

## Plans

- [`roupn`](./roupn/README.md)
- [`staark-common`](./staark-common/README.md)
- [`staark-isomorphic`](./staark-isomorphic/README.md)
- [`staark-patch`](./staark-patch/README.md)
- [`staark`](./staark/README.md)
- [`tiedliene`](./tiedliene/README.md)
- [`vroagn`](./vroagn/README.md)

## Recommended order

1. Add resource limits and secure defaults to `roupn`.
2. Reduce whole-state cloning costs in `tiedliene`.
3. Finish request concurrency coordination in `vroagn`.
4. Benchmark string construction in `staark-isomorphic`.
5. Make the trusted HTML contract configurable in `vroagn`.
