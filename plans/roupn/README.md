# `roupn` security and performance plan

## Goals

- Bound server resource use for rooms, connections, and messages.
- Protect room credentials and make secure deployment the obvious path.
- Validate network data before passing it to cryptographic and state code.

## Issue 1: Unlimited unauthenticated room creation

**Priority:** High

Every create-room request allocates persistent room state. Rooms without an
active creator do not expire, and there are no rate or global count limits.

### Resolution

1. Make room creation a `POST` operation.
2. Provide hooks for application authentication and authorization.
3. Add configurable per-address and global creation rate limits, or document a
   required integration point for the hosting server or reverse proxy.
4. Add a configurable maximum room count.
5. Expire rooms whose creator does not connect within a short timeout.
6. Add idle room expiration and ensure every removal path clears timers and
   closes sockets.
7. Avoid trusting forwarding headers unless the hosting application explicitly
   configures trusted proxies.

### Verification

- Use fake timers to test pending-creator and idle expiration.
- Load-test repeated room creation and confirm memory remains bounded.
- Test global and per-client limits and cleanup after failed upgrades.

## Issue 2: Unbounded WebSocket messages and broadcast amplification

**Priority:** High

Inbound messages are split and base64-decoded without a logical size limit.
Verified messages may then be copied to every room member.

### Resolution

1. Configure the WebSocket server with a strict `maxPayload`.
2. Add logical limits for segment count, key length, decoded field size, and
   total decoded message size.
3. Add per-connection token-bucket limits for messages and bytes.
4. Apply separate limits to direct messages, broadcasts, and handshake traffic.
5. Catch decode, deserialize, and send errors at the connection boundary; close
   offending connections with an appropriate policy code.
6. Check socket backpressure before sending and disconnect or defer slow
   consumers when buffered data exceeds a configured threshold.

### Verification

- Test malformed base64, missing separators, excessive segments, and oversized
  encoded and decoded payloads.
- Load-test one-to-many broadcasts and slow receivers.
- Confirm one malformed client cannot throw out of the server event handler.

## Issue 3: Creator secret appears in the WebSocket URL

**Priority:** Medium

The creator secret is placed in a query parameter, which can be retained in
reverse-proxy and application access logs.

### Resolution

1. Upgrade the socket without the creator secret in the URL.
2. Authenticate the creator in the first protocol message over the established
   secure connection.
3. Prefer a short-lived, single-use connection token minted by the room creation
   response.
4. Invalidate the token after successful use or expiration.
5. Document log redaction as migration guidance for existing deployments.

### Verification

- Confirm upgrade URLs and standard access logs contain no creator credential.
- Test token expiry, replay, wrong-room use, and concurrent redemption.

## Issue 4: Secure transport and origin policy are not enforced

**Priority:** Medium

The package defaults to plain HTTP and WebSocket URLs and accepts upgrades
without an origin policy. The defaults are useful locally but unsafe if copied
into a deployment.

### Resolution

1. Keep local development convenient while rejecting insecure remote origins by
   default.
2. Add an origin-validation callback to the socket upgrade handler.
3. Document mandatory TLS and `wss` for deployed applications.
4. Add optional protocol or subprotocol validation during upgrades.

### Verification

- Test allowed, missing, and rejected origins.
- Test that non-local insecure URLs produce a clear configuration error.

## Issue 5: Network state deltas require protocol-level validation

**Priority:** Critical dependency

The synchronizer applies received state deltas without validating their shape,
depth, change count, or serialized value size at the protocol boundary.

### Resolution

1. Add message schemas in `roupn` for every protocol message type.
2. Validate delta types, path depth, change count, and serialized value size
   before calling `applyDiff` or `revertDiff`.
3. Reject invalid messages and disconnect repeat offenders.

### Verification

- Add end-to-end tests with malicious delta paths and oversized change arrays.
- Confirm invalid messages do not partially change public state.

## Issue 6: Expensive cryptographic handshakes can be abused

**Priority:** Medium

Joining peers cause multiple 4096-bit RSA operations and key imports in clients.
Unverified users can repeatedly join and initiate handshake work.

### Resolution

1. Rate-limit joins and handshake messages before doing expensive work.
2. Add handshake deadlines and per-room limits for pending users.
3. Remove pending users that send malformed or out-of-order handshake messages.

### Completion criteria

- Room, connection, message, and pending-handshake resources are bounded.
- Credentials do not appear in URLs.
- All network messages are validated before state or cryptographic processing.
