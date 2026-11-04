# vroagn

A teensy-tiny library for managing network requests.

- Comes in at **under two and a half kilobytes** in size when compressed, or under four and a half with every parser included. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has features like **throttling, debouncing, delays, retries, and more**, making it easier to manage and control network traffic.
- Designed to be used with front-end frameworks such as [`@doars/staark`](https://github.com/doars/staark/tree/main/packages/staark#readme).

The heart of _vroagn_ is the `create` function, it helps you set up a reusable request configuration. Think of it like setting the table before a big feast—you get everything ready, and then just dig in whenever you're hungry (or in our case, need to make a request).

```JavaScript
import { create } from '@doars/vroagn'

const request = create({
  domain: 'https://api.example.com',
  path: '/v1/item',
  method: 'get',
  retryAttempts: 3,
  retryDelay: 1000,
})
```

Here, we set up a `GET` request to `https://api.example.com/v1/item` with a policy allowing up to three retries after the initial request, starting with a one-second delay. You can add [more options](#request-options), like custom headers, query parameters, or even timeout settings.

Once your request is created, sending it is as easy as pie. Just call the function with any additional options you need, and the library takes care of the rest.

```JavaScript
const [error, response, result] = await request()
console.log(error, response, result)
```

This sends the request and returns the response and parsed result, depending on the response type. It will automatically retry the request if it fails with specific HTTP status codes like `429 Too Many Requests` or `503 Service Unavailable`, or if the fetch itself fails, for example due to a network error.

The library tries to be smart: it knows that different content types need different handling. If you're fetching `JSON`, `XML`, `HTML`, or even `SVG`, the data will automatically be parsed correctly.

But what if you need to parse other data types? Say no more! The base library contains a handful of common parsing methods, while the full library adds `CSV/TSV`, `INI`, `TOML`, and even `YAML`.

```JavaScript
import {
  create,
  csvParser,
  iniParser,
  tomlParser,
  yamlParser,
} from '@doars/vroagn'

const request = create({
  domain: 'https://api.example.com',
  parsers: [
    csvParser(),
    iniParser(),
    tomlParser(),
    yamlParser(),
  ],
})
```

Two of the aforementioned parsers, `TOML` and `YAML`, are rather simple implementations as they are optimized for size not features. Therefore they do not support everything. If you do need to support the full specification I recommend creating a function that wraps an existing parser. The following is not supported:

- Escape sequences in strings are not processed, so `"a\nb"` keeps the backslash.
- A trailing `# comment` is removed, unless it comes after an unclosed quote, such as the apostrophe in the YAML value `it's # comment`. In TOML, a `#` on the opening line of a multi-line string can be mistaken for a comment.
- TOML nested arrays, inline tables inside arrays or other inline tables, dotted keys such as `a.b = 1`, and quoted keys.
- YAML inline mappings such as `{a: 1}`, which are returned as a string, nested inline lists, multiple documents, tags other than `!!int`, `!!float`, `!!str` and `!!bool`, quoted keys, complex keys, anchors on list items, and explicit indentation indicators such as `|2`.
- In YAML a key without a value becomes an empty object instead of `null`, and folded block scalars (`>`) also fold the line breaks around more-indented lines.

Lines the YAML parser does not understand throw a `SyntaxError`, as do TOML lines without a value.

The example below is a wrapper function for the [`smol-toml`](https://github.com/squirrelchat/smol-toml#readme) library.

```JavaScript
import { parse } from 'smol-toml'

const tomlParser = (
  options = {},
) => ({
  types: options.types || ['toml', 'application/toml', 'text/toml'],
  parser: async (
    response,
    requestOptions,
    type,
  ) => {
    const text = await response.text()
    return parse(text)
  },
})
```

And the example below is a wrapper for the [`js-yaml`](https://github.com/nodeca/js-yaml#readme) library.

```JavaScript
import { load } from 'js-yaml'

const yamlParser = (
  options = {},
) => ({
  types: options.types || ['yaml', 'application/yaml', 'text/yaml'],
  parser: async (
    response,
    requestOptions,
  ) => {
    const text = await response.text()
    return load(text, options)
  },
})
```

You can of course also write an entirely new parser based on a custom data specification, this is perfect for those quirky APIs with their own data formats.

A custom fetch function can also be specified using the `fetch` option. The examples directory contains an additional fetch function that writes successful requests to the browser's Cache API, keeping them available between page reloads independently of the browser's built-in HTTP cache.

```JavaScript
import { create } from '@doars/vroagn'
import { cacheFetch } from '[...]/exm/cache.js'

const request = create({
  domain: 'https://api.example.com',
  fetch: cacheFetch({
    name: 'vroagn-cache', // Optional.
    ttl: 60 * 60 * 1000, // One hour, optional.
  }),
})

const [error, response, result] = await request()
console.log(error, response, result)
```

## Using vroagn with staark

_vroagn_ and [_staark_](https://github.com/doars/staark/tree/main/packages/staark#readme) are like peanut butter and jelly. They're great on their own, but together they're unstoppable. Let's see how you can combine them to fetch data dynamically in your _staark_ powered application.

```JavaScript
import { mount, node } from '@doars/staark'
import { create } from '@doars/vroagn'

const requestItems = create({
  domain: 'https://api.example.com',
  path: '/v1/item',
  maxRequests: 1,
  retryAttempts: 4,
})

const [, , state] = mount(
  '#app',
  (state) => {
    return node('div', (
      (state.data ?? []).map(
        (item) => node('p', item.title),
      ),
    ))
  },
  { data: null },
)

requestItems().then(([error, response, result]) => {
  state.data = error ? [] : result
})
```

In this example, _staark_ and _vroagn_ team up to fetch and display a list of items. The data is only fetched once, and _vroagn_ handles any retry logic if the request fails. This approach ensures that your application remains responsive and resilient, even when the network isn't.

## Request options

When creating a request instance, you can pass an options object to configure its behaviour. Any send option can also be specified here and overridden by options passed to the returned method. Headers are the exception: initial and per-call headers are merged.

The full list of create options:

- `{number} maxConcurrency` The maximum number of concurrent requests allowed. It must be a positive integer. Omit it for unlimited concurrency. Initial and per-call limits share one strict FIFO queue.
- `{number} maxRequests` The maximum number of requests sent by this request instance. A request counts once, however often it is retried. Debounced calls count once per debounced request, and queued calls consume the limit when they start.
- `{function} createTrustedHTML` Converts the complete response string before an `html` or `html-partial` parsing sink. The callback may return `TrustedHTML` from an application policy.
- `{object} trustedTypesPolicy` A Trusted Types policy with a callable `createHTML` method. A per-call callback takes precedence over a per-call policy, then the initial callback and policy.

The full list of send options:

- `{any} body = null` The payload to be sent with the request, typically used with `post` or `put` methods. Plain objects and arrays are encoded as JSON, and get a `Content-Type: application/json` header when no content type is set. Any other body, such as a string, `FormData`, `Blob`, `URLSearchParams` or buffer, is passed to fetch unchanged.
- `{string} credentials` The credentials mode to use for the request. Options include `omit`, `same-origin`, or `include`. When omitted, fetch's default of `same-origin` applies.
- `{string} domain = ''` The base URL for the API. This URL is prefixed to all request paths.
- `{object|Headers} headers = {}` Custom headers to include with each request, as an object or a `Headers` instance. These headers are merged with any headers specified at the time of the request, ignoring the case of their names.
- `{string} method = 'get'` The HTTP method to use for the request. Common options include `get`, `post`, `put`, and `delete`.
- `{string} mode = null` The mode of the request. Options include `cors`, `no-cors`, or `same-origin`.
- `{string} path = ''` The endpoint path to be appended to the base URL.
- `{string} priority = null` The Fetch priority hint. Options include `high`, `normal`, or `low`. This does not reorder vroagn's FIFO scheduler.
- `{object} queryParams = {}` Query parameters to append to the request URL. They are added after any query already in the path, and before any `#fragment`.
- `{string} redirect = null` The way to handle redirect responses. Options include `error`, `follow`, or `manual`.
- `{Parser[]} parsers = null` A list of additional custom parsers for when the built-in parsers aren't sufficient.
- `{string} type = null` Specifies the expected response type for the request. This overrides the automatic type determination.
- `{AbortController} abort = null` A custom `AbortController` instance for cancelling the request. Aborting also ends any `delay`, `throttle` or retry wait.
- `{string} cache = 'default'` The cache mode for the request. Options include `default`, `no-store`, `reload`, `no-cache`, `force-cache`, or `only-if-cached`.
- `{function} fetch = fetch` Allows the setting of a custom fetch function to use.
- `{number} debounce = 0` Time in milliseconds to delay the request after it has been triggered. If a new request is triggered within this time, the timer resets.
- `{number} delay = 0` Time in milliseconds to delay the start of the request.
- `{number} retryAttempts = 0` The number of retry attempts allowed before giving up on the request. A request is retried when the response has one of the `retryCodes`, or when the fetch itself fails, for example due to a network error.
- `{number[]} retryCodes = [429, 503, 504,]` An array of HTTP status codes that will trigger a retry if encountered. If a  `Retry-After` header is given by the response it will be used if the retry after moment is later that the retry delay.
- `{number} retryDelay = 500` Time in milliseconds to wait between retry attempts if retries are enabled. The delay between retries will increase exponentially, doubling after each failed attempt. This can help to reduce the load on the server during periods of high failure rates.
- `{number} maximumRetryDelay` Optional upper bound for retry delays.
- `{number} throttle = 0` Time in milliseconds to throttle requests. Limits the number of requests that can be made within a specified time frame.
- `{number} timeout = 0` Time in milliseconds before the request times out. If the request, including its retries, exceeds this duration, it will be aborted.

The returned method resolves to `[error, response, result]`, containing an error when one occurred, the raw response when available, and the parsed body. Expected request failures are returned in this tuple. When the response has an unsuccessful status the error's message is the status text, or `Request failed with status <status>` when the status text is empty, and the error has `status` and `response` properties. Invalid creation options, such as a non-positive `maxConcurrency`, can throw synchronously.

## Parsing

The following types will be automatically parsed and determined.

- The type `arrayBuffer` will be parsed as an array buffer.
- The type `blob` will be parsed as a blob.
- The type `formData` will be parsed as form data.
- The type `text` will be parsed as text. An `Accept` or `Content-Type` header of `text/plain`, or a file extension of `txt`, is also parsed as text.
- The type `json` will be parsed as JSON. An `Accept` or `Content-Type` header of `application/json` or `text/json`, or a file extension of `json`, is also parsed as JSON.
- The type `xml` will be parsed as XML. An `Accept` or `Content-Type` header of `application/xml` or `text/xml`, or a file extension of `xml`, is also parsed as XML.
- The type `html` will be parsed as an HTML document. An `Accept` or `Content-Type` header of `text/html`, or a file extension of `html`, is also parsed as an HTML document.
- The type `html-partial` will be parsed as partial HTML content. An `Accept` or `Content-Type` header of `text/html-partial` is also parsed as partial HTML content.
- The type `svg` will be parsed as an SVG document. An `Accept` or `Content-Type` header of `image/svg+xml`, or a file extension of `svg`, is also parsed as an SVG document.

> `html` and `html-partial` parse trusted content and do not sanitize it. Using either mode asserts that you trust the response origin and content. For untrusted HTML, sanitize with a maintained sanitizer inside your application's Trusted Types policy and pass that policy with `trustedTypesPolicy`. A `TrustedHTML` value only reflects the policy that created it; it does not sanitize content by itself.

```JavaScript
const policy = trustedTypes.createPolicy('vroagn', {
  createHTML: (html) => DOMPurify.sanitize(html, {
    RETURN_TRUSTED_TYPE: false,
  }),
})

const request = create({
  trustedTypesPolicy: policy,
  type: 'html-partial',
})
```

## Installation

Via NPM

```ZSH
npm install @doars/vroagn
```

IIFE build via a CDN

```HTML
<!-- Base bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.base.iife.js"></script>
<!-- Base bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.base.iife.min.js"></script>
<!-- Full bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.iife.js"></script>
<!-- Full bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.iife.min.js"></script>
```

ESM build via a CDN

```JavaScript
// Base bundle.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.base.js'
// Base bundle minified.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.base.min.js'
// Full bundle.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.js'
// Full bundle minified.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.min.js'
```

For compact language-model documentation, see [`llms.txt`](./llms.txt).
