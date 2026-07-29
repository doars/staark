# Changelog

## Unreleased

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
