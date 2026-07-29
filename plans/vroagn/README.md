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

This issue is optional and should be implemented after the concurrency fix so
request lifecycle and parsing-policy changes remain independently reviewable.

### Resolution

1. Document that `html` and `html-partial` response modes parse trusted content
   and do not sanitize it. Explain that choosing one of these modes asserts trust
   in the response origin and content.
2. Add an optional `createTrustedHTML` setting to both initial and per-call
   options for HTML response modes. It should
   receive the response string and return either a `TrustedHTML` value produced
   by the application's Trusted Types policy or a compatible value for browsers
   without Trusted Types support.
3. Also accept a `trustedTypesPolicy` object with a `createHTML()` method. A
   per-call callback takes precedence over a per-call policy, then the initial
   callback, then the initial policy. Reject present but non-callable options.
4. Pass the resulting `TrustedHTML` value directly to HTML injection sinks such
   as `template.innerHTML` and to APIs that accept trusted HTML. Do not convert it
   back to an ordinary string before use.
5. Let applications combine validation or sanitization with their Trusted Types
   policy. Do not ship an incomplete built-in sanitizer or imply that the
   `TrustedHTML` type sanitizes content by itself; safety depends on the policy
   that created the value.
6. When Trusted Types enforcement rejects a sink and no trusted HTML option was
   provided, preserve the thrown cause and return a clear parsing error naming
   the required option. Do not infer enforcement from browser globals or the
   user agent.
7. Keep current string parsing as the backward-compatible default for trusted
   domains and browsers where Trusted Types enforcement is not enabled.

### Verification

- Test the existing trusted-domain string behavior remains unchanged by default.
- Test a `createTrustedHTML` callback is invoked once with the complete response.
- Test the returned trusted value reaches the parsing sink without string
  coercion.
- Test callback and policy errors are returned as parsing errors.
- Test precedence between initial and per-call callback and policy options.
- Test that non-HTML response modes never invoke trusted HTML options.
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

All calls made by one `create()` result share the scheduler. Keep the existing
per-call `maxConcurrency` override for backward compatibility.

### Resolution

1. Route limited and unlimited calls through one scheduler and invoke the same
   queue-drain function after every completion, rejection, and cancellation.
2. Give each request an effective limit from its merged options. Missing
   `maxConcurrency` means `Infinity`; a configured value must be a positive
   integer.
3. Preserve strict FIFO admission: inspect the queue head and start it only when
   `activeRequests < effectiveLimit`. Do not skip a blocked head for a later
   request with a higher limit, because that can starve low-limit calls.
4. Continue draining after each admission while the next head is eligible. A
   request that starts immediately must use the same admission path.
5. Remove aborted queued entries atomically, settle them using the existing
   result tuple, and drain again. Aborting after admission releases its slot
   exactly once.
6. Keep `maxRequests` accounting separate. Document whether queued and
   debounced calls consume it at submission or fetch start, and ensure rejected
   calls cannot decrement or reuse the counter.

### Verification

- Start an unlimited request, queue a request with `maxConcurrency: 1`, and
  confirm the second request starts when the first finishes.
- Cover the inverse order and multiple per-call concurrency values.
- Assert every queued promise settles after preceding requests complete.
- Test cancellation at and behind the queue head, fetch rejection, synchronous
  fetch throws, debounce plus concurrency, and an unlimited request completing
  while limited work is queued.
- Assert `activeRequests` never becomes negative and never exceeds the effective
  limit of an admitted request with a finite limit.

### Completion criteria

- All object-producing parsers resist prototype pollution.
- Every scheduled request settles and concurrency is queue-based.
- Timeout and retry resources are released deterministically.
- Mixed initial and per-call concurrency settings cannot strand work.
