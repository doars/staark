# `roupn` security and performance plan

## Goals

- Bound server resource use for rooms, connections, and messages.
- Protect room credentials and make secure deployment the obvious path.
- Validate network data before passing it to cryptographic and state code.

## Current baseline

- Room creation already requires `POST`.
- `maxRooms` and validated per-room user limits are implemented.
- Room codes already use rejection-sampled cryptographic randomness.
- Diff path validation is implemented in `tiedliene`, but `roupn` must still
  validate complete messages before invoking it.

The remaining work must preserve loopback development. New limits need finite,
documented defaults, constructor validation, and an explicit disable mechanism
only where disabling is safe.

## Proposed defaults

Use these as initial public defaults, then adjust only when tests or load
measurements show they are impractical:

| Option | Default | Notes |
| --- | ---: | --- |
| `creatorJoinTimeout` | 30 seconds | Removes an unclaimed room. |
| `roomIdleTimeout` | 30 minutes | Refreshes only after accepted activity. |
| `maxPendingUsersPerRoom` | 8 | Also bounded by `maxUsersPerRoom`. |
| Per-address room creation | 10 per minute | Token-bucket burst of 10. |
| Global room creation | 100 per minute | Token-bucket burst of 100. |
| Per-address joins | 30 per minute | Applied before socket admission. |
| Connection messages | 60 per 10 seconds | Token-bucket burst of 60. |
| Connection encoded bytes | 1 MiB per 10 seconds | Independent byte bucket. |
| Handshake messages | 10 per minute | Applied before cryptographic work. |
| Encoded WebSocket message | 256 KiB | Must not exceed server `maxPayload`. |
| Protocol segments | 16 | Duplicate keys remain invalid. |
| Segment key | 64 bytes | Measure UTF-8 bytes. |
| Decoded field | 192 KiB | Enforced during decoding. |
| Total decoded fields | 256 KiB | Sum across all segments. |
| Socket `bufferedAmount` | 1 MiB | Close the slow consumer. |
| Handshake timeout | 30 seconds | One timer per pending user. |

Use explicit `0` only for documented disableable timeouts. Counts, byte limits,
and pending-user limits must remain positive. Allow applications to override
all rate and size defaults without replacing the limiter implementation.

## Issue 1: Unlimited unauthenticated room creation

**Priority:** High

Every accepted create-room request allocates persistent room state. `maxRooms`
bounds the count, but rooms without an active creator do not expire and creation
has no per-address or global rate limit.

### Resolution

1. Add a synchronous `authorizeRoomCreation({ request, remoteAddress })` hook so
   `handleHttpRequest` remains synchronous. False returns `403`; a thrown error
   returns `500` without creating a room.
2. Add `roomCreationsPerAddress` and `roomCreationsGlobal` token-bucket options
   using the defaults above. Resolve the address, consume both buckets, then run
   authorization. Every attempt that reaches this handler consumes both
   buckets, including unauthorized and otherwise invalid requests. A depleted
   bucket returns `429` with `Retry-After` and a stable error code.
3. Add `getRemoteAddress(request)`. Default to the socket address and never read
   forwarding headers unless the application supplies this callback.
4. Expire rooms whose creator does not connect within a configurable
   `creatorJoinTimeout`.
5. Add `roomIdleTimeout`. Define activity as a successful join or accepted
   protocol message; rejected traffic must not keep a room alive.
6. Store timer identifiers on each room and route expiry, explicit removal,
   creator departure, and empty-room cleanup through one idempotent removal
   function that clears timers and closes sockets.
7. Return stable serialized error codes for `maxRooms` and rate-limit failures
   rather than exposing internal exception messages.
8. Document an additional reverse-proxy rate limit for production deployments.

### Verification

- Use fake timers to test pending-creator and idle expiration.
- Load-test repeated room creation and confirm memory remains bounded.
- Test global and per-client limits and cleanup after failed upgrades.
- Test authorization, address resolution, stable error responses, and that
  rejected traffic does not refresh idle expiry.

## Issue 2: Unbounded WebSocket messages and broadcast amplification

**Priority:** High

Inbound messages are split and base64-decoded without a logical size limit.
Verified messages may then be copied to every room member.

### Resolution

1. Document that callers must construct `WebSocketServer` with `maxPayload`;
   the connector receives an existing server and cannot configure it safely.
   Add a connector-side encoded-size check as defense in depth.
2. Add validated options for encoded bytes, segment count, key length, decoded
   field bytes, total decoded bytes, and socket `bufferedAmount`.
3. Change `decode` to reject duplicate keys, missing separators, unknown keys,
   malformed base64, and oversized values. Return a null-prototype record or an
   equally safe dictionary.
4. Enforce encoded limits before splitting and decoded limits incrementally so
   an oversized decoded value is not allocated before rejection.
5. Add per-connection token buckets for message count and encoded bytes. Store
   limiter state with `UserData` and use a monotonic clock where available.
6. Apply separate budgets to direct, broadcast, server, and handshake messages.
   Count rejected messages and close repeat offenders.
7. Catch decode, deserialize, validation, and send errors at the connection
   boundary and close offenders with stable policy reasons.
8. Before every send, check `readyState` and `bufferedAmount`. Close slow
   consumers without preventing delivery to healthy room members.

### Verification

- Test malformed base64, missing separators, excessive segments, and oversized
  encoded and decoded payloads.
- Load-test one-to-many broadcasts and slow receivers.
- Confirm one malformed client cannot throw out of the server event handler.
- Verify all size accounting uses bytes rather than JavaScript string length.

## Issue 3: Creator secret appears in the WebSocket URL

**Priority:** Medium

The creator secret is placed in a query parameter, which can be retained in
reverse-proxy and application access logs.

### Resolution

1. Add an explicit creator-authentication phase. Before authentication, the
   reserved creator socket cannot broadcast, verify users, or close the room.
2. Replace the URL secret with a cryptographically random, short-lived,
   single-use `creatorConnectionToken` from room creation. Store only its digest
   server-side and compare digests without data-dependent early exit.
3. Send the token in the first WebSocket protocol message and reject any other
   first message from the reserved creator connection.
4. Bind the token to its room, expire it with `creatorJoinTimeout`, and redeem it
   atomically. Concurrent redemption has exactly one winner.
5. Remove the `creator` query parameter from new client URLs. If temporary
   compatibility remains, require an opt-in deprecated option and document its
   removal timeline.
6. Document access-log redaction for deployments that received the old format.

### Verification

- Confirm upgrade URLs and standard access logs contain no creator credential.
- Test token expiry, replay, wrong-room use, and concurrent redemption.
- Test out-of-order messages and disconnects before authentication; both must
  release reserved state and timers deterministically.

## Issue 4: Secure transport and origin policy are not enforced

**Priority:** Medium

The package defaults to plain HTTP and WebSocket URLs and accepts upgrades
without an origin policy. The defaults are useful locally but unsafe if copied
into a deployment.

### Resolution

1. Define loopback as `localhost`, `127.0.0.0/8`, and `::1`; private network
   ranges are not local by default.
2. Reject non-loopback `http:` and `ws:` client base URLs unless an explicit
   development override is enabled.
3. Default to same-origin upgrades by comparing `Origin` with the configured
   server origin. Reject a missing `Origin` by default. Add
   `validateOrigin({ origin, request })` so applications can explicitly allow
   different origins or non-browser clients; false and thrown errors reject the
   upgrade without creating user state.
4. Add a WebSocket subprotocol allowlist and reject upgrades that do not
   negotiate an allowed value when configured.
5. Document TLS termination and `https`/`wss` production requirements.

### Verification

- Test allowed, missing, and rejected origins.
- Test that non-local insecure URLs produce a clear configuration error.

## Issue 5: Network state deltas require protocol-level validation

**Priority:** Critical dependency

The synchronizer applies received state deltas without validating their shape,
depth, change count, or serialized value size at the protocol boundary.

### Resolution

1. Inventory every value in `message-types.js`. Define its direction, allowed
   connection phase, required and optional keys, scalar types, and collection or
   string limits. Reject unknown keys unless a versioned extension exists.
2. Validate delta types, path depth, change count, and serialized value size
   before calling `applyDiff` or `revertDiff`.
3. Validate public/private handshake payloads before importing keys or starting
   expensive cryptographic work; deserialization alone is not validation.
4. Add a protocol version to the initial handshake and a stable unsupported-
   version error.
5. Close on the first schema or phase violation with code `1008` and a stable,
   non-sensitive reason. Rate-limit violations may use a configurable strike
   count, but malformed data never receives a retry path on the same socket.

### Verification

- Add end-to-end tests with malicious delta paths and oversized change arrays.
- Confirm invalid messages do not partially change public state.
- Test every type in the wrong direction and phase, unknown types, extra keys,
  wrong scalar types, excessive nesting, and cyclic custom-deserializer output.

## Issue 6: Expensive cryptographic handshakes can be abused

**Priority:** Medium

Joining peers cause multiple 4096-bit RSA operations and key imports in clients.
Unverified users can repeatedly join and initiate handshake work.

### Resolution

1. Add `maxPendingUsersPerRoom`. The reserved creator counts as pending until
   creator authentication succeeds, after which only unverified peers count.
2. Apply join and handshake limits before key import, RSA generation, or
   verification work is scheduled.
3. Add `handshakeTimeout` per pending user and clear it on verification,
   departure, removal, and protocol failure.
4. Model handshake phases explicitly and reject malformed, duplicate, or
   out-of-order messages before cryptographic processing.
5. Remove pending users on timeout or violation without broadcasting unverified
   attacker-controlled data.

### Verification

- Use an injectable clock and deterministic limiter settings in tests.
- Confirm concurrent joins never exceed the pending-user limit.
- Instrument expensive operations and assert rejected traffic does not invoke
  them.

### Completion criteria

- Room, connection, message, and pending-handshake resources are bounded.
- Credentials do not appear in URLs.
- All network messages are validated before state or cryptographic processing.
- Every limit has a finite documented default and constructor validation.
- Timers, limiter entries, pending tokens, and sockets have deterministic
  cleanup paths.
