# staark common

Common set of abstract-node helpers and utilities used by the [staark](https://github.com/doars/staark#readme) packages.

Most applications can import these helpers from `@doars/staark`, `@doars/staark-patch`, or `@doars/staark-isomorphic`. This package is useful when you are building tooling or another renderer around Staark's abstract node format.

```JavaScript
import { conditional, node } from '@doars/staark-common'

const tree = node('main', [
  node('h1', 'Hello'),
  ...conditional(true, node('p', 'Welcome')),
])
```

The `node` function only creates an abstract object; it does not touch the DOM itself. The package also exports `memo`, `conditional`, `match`, `nde`, `factory`, and `fctory`, alongside the array, cloning, comparison, selector, attribute, identifier, marker, and DOM conversion utilities used by the renderers. Note that DOM conversion helpers such as `childrenToNodes` require browser DOM APIs.

## Installation

Via NPM

```ZSH
npm install @doars/staark-common
```

IIFE build via a CDN

```HTML
<!-- Bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-common@1/dst/staark-common.iife.js"></script>
<!-- Bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-common@1/dst/staark-common.iife.min.js"></script>
```

ESM build via a CDN

```JavaScript
// Bundle.
import { node } from 'https://cdn.jsdelivr.net/npm/@doars/staark-common@1/dst/staark-common.js'
// Bundle minified.
import { node } from 'https://cdn.jsdelivr.net/npm/@doars/staark-common@1/dst/staark-common.min.js'
```

For compact language-model documentation, see [`llms.txt`](./llms.txt).
