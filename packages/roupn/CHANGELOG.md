# Changelog

## Unreleased

- Bind decrypted message senders to their server-authenticated WebSocket
  connections and advance the room protocol to version 2.
- Contain asynchronous decrypting, key-importing, and message-processing errors
  in the WebSocket message handler.
- Mark the room creator as verified for every connected client.
- Bound encoded and decoded protocol messages, reject malformed segments, and
  use null-prototype decoded records.
- Add per-connection message, byte, and handshake budgets and close slow
  consumers without disrupting healthy recipients.
- Replace creator URL secrets with digested, single-use first-message tokens.
- Preserve creator reservations when an unauthenticated creator connection
  closes or fails authentication.
- Require secure non-loopback client URLs and same-origin WebSocket upgrades by
  default, with explicit origin, subprotocol, and development overrides.
- Add protocol versioning, message-shape checks, state-delta limits, pending-user
  caps, and handshake expiry.
- Add configurable global and per-address token buckets for room creation.
- Add room-creation authorization and safe remote-address resolution callbacks.
- Expire unclaimed and idle rooms and centralize room timer and socket cleanup.
- Return stable HTTP error codes for room limits, authorization, and rate limits.
- Enforce validated per-room and global room limits, including when callers omit
  a room limit.
- Require POST for room creation and generate room codes with unbiased
  cryptographic randomness.

## 0.1.1

- Added security checks.
- Upgraded depedency.

## 0.1.0

- Add public data exchanged on joining.
- Add private data exchanged on joining over end-to-end encryption.
- Removed rate limiter from server.
- Removed unnecessary double encryption when transferring shared key.

## 0.0.0

- Initial release.
