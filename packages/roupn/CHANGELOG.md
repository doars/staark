# Changelog

## Unreleased

- Update the protocol to version 3, which isn't compatible with version 2.
- Derive the verification code from every key exchanged in the handshake, so a relay in the middle can no longer swap keys unnoticed. The joiner commits to its keys before seeing the creator's, and the rest of the handshake is encrypted with a key derived from the compared secret.
- Only base64-encode the server and direct payloads, instead of encoding encrypted values a second time.
- Only accept room and user events from the server, and only let unverified users message the creator.
- Require the whole verification code in `verifyUser`.
- Exchange and check the private data given to `createRoom` and `joinRoom`.
- Fix leaving and rejoining a room crashing the connection.
- Keep the connection when handling one message fails, handle messages one at a time, and always dispatch `onError` with `{ error }`.
- Dispatch `onError` when `createRoom` fails, instead of throwing and leaving the connector stuck.
- Stop one address from using up the global room creation budget, and answer non-POST requests before any rate limit.
- Apply synchronized state updates in the same order on every client, accept full state syncs only from the creator, and clear the history when leaving.
- Reject `__proto__`, `constructor` and `prototype` keys anywhere in received state updates and syncs.
- Keep private keys non-extractable. Keys are still generated in a worker, so generating them doesn't block rendering.
- Require `serverOrigin` or `validateOrigin` when `NODE_ENV` is `production`.
- Document `sendUpdate`, `serverOrigin`, private data and the client limits.

## 0.2.1

- Update and improve the `README.md`.
- Document the package API for language models in `llms.txt`.

## 0.2.0

- Bind decrypted message senders to their server-authenticated WebSocket connections and advance the room protocol to version 2.
- Contain asynchronous decrypting, key-importing, and message-processing errors in the WebSocket message handler.
- Mark the room creator as verified for every connected client.
- Bound encoded and decoded protocol messages, reject malformed segments, and use null-prototype decoded records.
- Add per-connection message, byte, and handshake budgets and close slow consumers without disrupting healthy recipients.
- Replace creator URL secrets with digested, single-use first-message tokens.
- Preserve creator reservations when an unauthenticated creator connection closes or fails authentication.
- Require secure non-loopback client URLs and same-origin WebSocket upgrades by default, with explicit origin, subprotocol, and development overrides.
- Add protocol versioning, message-shape checks, state-delta limits, pending-user caps, and handshake expiry.
- Add configurable global and per-address token buckets for room creation.
- Add room-creation authorization and safe remote-address resolution callbacks.
- Expire unclaimed and idle rooms and centralize room timer and socket cleanup.
- Return stable HTTP error codes for room limits, authorization, and rate limits.
- Enforce validated per-room and global room limits, including when callers omit a room limit.
- Require POST for room creation and generate room codes with unbiased cryptographic randomness.

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
