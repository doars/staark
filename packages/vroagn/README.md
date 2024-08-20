# vroagn

A teensy-tiny library for managing network requests.

- Comes in at *a kilobyte and half* in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has features like throttling, debouncing, delays, retries, and more, making it easier to manage and control network traffic.
- Designed to be used with front-end frameworks such as [`@doars/staark`](https://github.com/doars/staark/tree/main/packages/staark#readme).

The heart of _vroagn_ is the `create` function, it helps you set up a reusable request configuration. Think of it like setting the table before a big feast—you get everything ready, and then just dig in whenever you're hungry (or in our case, need to make a request).

```JS
import { create } from '@doars/vroagn'

const request = create({
  domain: '://api.example.com',
  path: '/v1/item',
  method: 'get',
  retryAttempts: 3,
  retryDelay: 1000,
})
```

Here, we set up a `GET` request to `https://api.example.com/data` with a retry policy that attempts the request up to three times, waiting one second between attempts. You can add [more options](#request-options), like custom headers, query parameters, or even timeout settings.

Once your request is created, sending it is as easy as pie. Just call the function with any additional options you need, and the library takes care of the rest.

```JS
const [response, result] = await request()
console.log(response, result)
```

This sends the request and returns the response and parsed result, depending on the response type. It will automatically retry the request if it fails with specific HTTP status codes like `429 Too Many Requests` or `503 Service Unavailable`.

The library tries to be smart, it knows that different content types need different handling. If you're fetching `JSON`, `XML`, `HTML`, or even `SVG`, the data will automatically be parses correctly.

But, what if you need to parse other data types? Say no more! The base library only contains a hand full of common parsing methods, but the full library has a few additional ones. For example parsing `CSV/TSV`, `INI`, `TOML` and even `YAML`.

```JS
import {
  create,
  csvParser,
  iniParser,
  tomlParser,
  yamlParser,
} from '@doars/vroagn'

const request = create({
  domain: '://api.example.com',
  responseParsers: [
    csvParser,
    iniParser,
    tomlParser,
    yamlParser,
  ],
})
```

Two of the aforementioned parsers, `TOML` and `YAML`, are rather simple implementations as they are optimized for size not features. Therefore they will not support everything for example parsing complex data types and proper error handling. If you do need to support the full specification I recommend creating a function that wraps an existing parser.

The example below is a wrapper function for the [`smol-toml`](https://github.com/squirrelchat/smol-toml#readme) library.

```JS
import { parse } from 'smol-toml'

const tomlParser = (
) => ({
  types: options.types || ['toml', 'application/toml', 'text/toml'],
  parser: async (
    response,
    requestOptions,
  ) => {
    const text = await response.text()
    return parse(text)
  },
})
```

And the example below is a wrapper for the [`js-yaml`](https://github.com/nodeca/js-yaml#readme) library.

```JS
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

## Using vroagn with staark

_vroagn_ and [_staark_](https://github.com/doars/staark/tree/main/packages/staark#readme) are like peanut butter and jelly. They're great on their own, but together they're unstoppable. Let's see how you can combine them to fetch data dynamically in your _staark_ powered application.

```JS
import { mount, node } from '@doars/staark'
import { create } from '@doars/vroagn'

const requestItems = create({
  domain: '://api.example.com',
  path: '/v1/item',
  maxRequests: 1,
  retryAttempts: 4,
})

mount(
  document.body.firstElementSibling,
  (state) => {
    if (!state.data) {
      requestItems()
        .then(
          ([response, result]) => state.data => result,
        )
    }
    return node('div', (
      (state.data ?? []).map(
        (item) => node('p', item.title),
      ),
    ))
  },
  { data: null },
)
```

In this example, _staark_ and _vroagn_ team up to fetch and display a list of items. The data is only fetched once, and _vroagn_ handles any retry logic if the request fails. This approach ensures that your application remains responsive and resilient, even when the network isn't.

## Request options

When creating a request instance, you can pass an options object to configure the request behaviour. Note that any send options can also be specified here, but will be overwritten with by the options given to the returned method. With one exception, the headers object will be merged with one anther.

The full list of create options:

- `{number} maxConcurrency = 0` The maximum number of concurrent requests allowed. Requests exceeding this limit are queued until one completes. Zero means unlimited.

The full list of send options:

- `{object} body = null` The payload to be sent with the request, typically used with `post` or `put` methods.
- `{string} credentials = 'omit'` The credentials mode to use for the request. Options include `omit`, `same-origin`, or `include`.
- `{string} domain = ''` The base URL for the API. This URL is prefixed to all request paths.
- `{object} headers = {}` Custom headers to include with each request. These headers are merged with any headers specified at the time of the request.
- `{string} method = 'get'` The HTTP method to use for the request. Common options include `get`, `post`, `put`, and `delete`.
- `{string} mode = null` The mode of the request. Options include `cors`, `no-cors`, or `same-origin`.
- `{string} path = ''` The endpoint path to be appended to the base URL.
- `{string} priority = null` The priority of the request. Options include `high`, `normal`, or `low`. Higher priority requests are executed first.
- `{object} queryParams = {}` Query parameters to append to the request URL.
- `{string} redirect = {}` The way to handle redirect responses. Options include `error`, `follow`, or `manual`.
- `{Parser[]} parsers = null` A list of additional custom parsers for when the build-in parsers aren't sufficient.
- `{string} type = null` Specifies the expected response type for the request. This overrides the automatic type determination.
- `{AbortController} abort = null` A custom `AbortController` instance for cancelling the request.
- `{string} cache = 'default'` The cache mode for the request. Options include `default`, `no-store`, `reload`, `no-cache`, `force-cache`, or `only-if-cached`.
- `{number} debounce = 0` Time in milliseconds to delay the request after it has been triggered. If a new request is triggered within this time, the timer resets.
- `{number} delay = 0` Time in milliseconds to delay the start of the request.
- `{number} retryAttempts = 0` The number of retry attempts allowed before giving up on the request.
- `{number[]} retryCodes = [429, 503, 504,]` An array of HTTP status codes that will trigger a retry if encountered. If a  `Retry-After` header is given by the response it will be used if the retry after moment is later that the retry delay.
- `{number} retryDelay = 500` Time in milliseconds to wait between retry attempts if retries are enabled. The delay between retries will increase exponentially, doubling after each failed attempt. This can help to reduce the load on the server during periods of high failure rates.
- `{number} throttle = 0` Time in milliseconds to throttle requests. Limits the number of requests that can be made within a specified time frame.
- `{number} timeout = 0` Time in milliseconds before the request times out. If the request exceeds this duration, it will be aborted.

The `send` method returns a promise that resolves to a tuple containing the raw response object and the parsed response body. If the response is JSON and accepts is set to json, it will be parsed automatically.

## Parsing

The following types will be automatically parsed and determined.

- The type `arrayBuffer` will be parsed as an array buffer.
- The type `blob` will be parsed as a blob.
- The type `formData` will be parsed as form data.
- The type `text` will be parsed as text. A `Content-Type` or `Accepts` headers of `text/plain` or a file extension of `txt` are also parsed as text.
- The type `json` will be parsed as JSON. A `Content-Type` or `Accepts` headers of `application/json` or `text/json` or a file extension of `json` are also parsed as JSON.
- The type `xml` will be parsed as XML. A `Content-Type` or `Accepts` headers of `application/xml` or `text/xml` or a file extension of `xml` are also parsed as XML.
- The type `html` will be parsed as a HTML document. A `Content-Type` or `Accepts` headers of `text/html` or a file extension of `html` are also parsed as a HTML document.
- The type `html-partial` will be parsed as partial HTML content. A `Content-Type` or `Accepts` headers of `text/html-partial` are also parsed as partial HTML content.
- The type `svg` will be parsed as a SVG document. A `Content-Type` or `Accepts` headers of `image/svg+xml` or a file extension of `svg` are also parsed as a SVG document.

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

```JS
// Base bundle.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.base.js'
// Base bundle minified.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.base.min.js'
// Full bundle.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.js'
// Full bundle minified.
import { create } from 'https://cdn.jsdelivr.net/npm/@doars/vroagn@1/dst/vroagn.min.js'
```
