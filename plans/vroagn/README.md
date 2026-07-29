# `vroagn` security and performance plan

## Goals

- Safely parse untrusted structured response formats.
- Ensure request scheduling never leaves callers permanently pending.
- Replace polling with bounded, fair request coordination.

## Issue 1: Make the trusted HTML contract configurable

**Priority:** Optional security hardening

HTML response modes intentionally assume that the requested domain and its
response are trusted. Parsing the response without sanitizing it is therefore
not considered a defect in the default contract. The package should make that
contract explicit and offer controls for applications with stricter trust
boundaries.

### Resolution

1. Document that `html` and `html-partial` response modes parse trusted content
   and do not sanitize it. Explain that choosing one of these modes asserts trust
   in the response origin and content.
2. Add an optional `createTrustedHTML` setting for HTML response modes. It should
   receive the response string and return either a `TrustedHTML` value produced
   by the application's Trusted Types policy or a compatible value for browsers
   without Trusted Types support.
3. Also consider accepting a `trustedTypesPolicy` setting and calling its
   `createHTML()` method. Supporting the callback form keeps `vroagn` independent
   of how the application creates, names, and configures its policy.
4. Pass the resulting `TrustedHTML` value directly to HTML injection sinks such
   as `template.innerHTML` and to APIs that accept trusted HTML. Do not convert it
   back to an ordinary string before use.
5. Let applications combine validation or sanitization with their Trusted Types
   policy. Do not ship an incomplete built-in sanitizer or imply that the
   `TrustedHTML` type sanitizes content by itself; safety depends on the policy
   that created the value.
6. Define behavior when a site enforces Trusted Types but no trusted HTML option
   is provided. Return a clear parsing error rather than silently bypassing the
   policy.
7. Keep current string parsing as the backward-compatible default for trusted
   domains and browsers where Trusted Types enforcement is not enabled.

### Verification

- Test the existing trusted-domain string behavior remains unchanged by default.
- Test a `createTrustedHTML` callback is invoked once with the complete response.
- Test the returned trusted value reaches the parsing sink without string
  coercion.
- Test callback and policy errors are returned as parsing errors.
- Test operation with and without Trusted Types support and with enforcement
  enabled where the test environment permits it.
- Document an example policy using a maintained sanitizer for applications that
  accept untrusted HTML.

## Issue 2: Mixed concurrency limits can leave requests pending

**Priority:** High

The FIFO queue replaces animation-frame polling for concurrency-limited
requests. However, `activeRequests` also counts requests without a concurrency
limit. When an unlimited request occupies the last slot for a later limited
request, completing the unlimited request decrements the count without releasing
the queue. The limited request can remain pending forever.

### Resolution

1. Use one concurrency policy for a request client, or make every completion
   release eligible queued work regardless of the completed request's options.
2. Define how per-call `maxConcurrency` overrides interact with the shared
   queue.
3. Keep FIFO ordering while admitting all requests that fit the active policy.

### Verification

- Start an unlimited request, queue a request with `maxConcurrency: 1`, and
  confirm the second request starts when the first finishes.
- Cover the inverse order and multiple per-call concurrency values.
- Assert every queued promise settles after preceding requests complete.

### Completion criteria

- All object-producing parsers resist prototype pollution.
- Every scheduled request settles and concurrency is queue-based.
- Timeout and retry resources are released deterministically.
