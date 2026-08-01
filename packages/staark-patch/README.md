# staark patch

A teeny-tiny stateless framework for building web apps.

- Minimal amount of concepts to learn in order to get going, meaning the system becomes incredibly **easy to reason with**.
- Comes in at **a kilobyte** in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has an **efficient diffing algorithm**. This ensures the node tree is morphed quickly from the old to the new with minimal overhead.

> Looking for one with a state management solution? Check out [staark](https://github.com/doars/staark/tree/main/packages/staark#readme).

To use staark patch, you need to know two main functions the `prepare` and `node`. With `prepare`, you set up the `patch` function, which will update a section of the node tree based on new abstract node tree you provide. The `node` function creates those abstract representations of document elements, which staark patch uses to manipulate the actual document.

```JavaScript
import { node as n, prepare } from '@doars/staark-patch'

const patch = prepare(
  '#app',
)

patch(
  n('div', [
    n('p', 'Hello there'),
    n('p', 'General Kenobi'),
  ]),
)
```

The `prepare` function attaches the `patch` function to the element matching `#app`. The `patch` function is then used to apply a simple view of two paragraphs into the document. Every time `patch` is called, the document updates based on the new nodes passed to it.

Even though patch is stateless, you can still use it for dynamic updates by manually handling state changes within your code. The library provides an easy and efficient way to re-render parts of your document when you modify your data.

```JavaScript
import { node as n, prepare } from '@doars/staark-patch'

const patch = prepare(
  '#app',
)

const state = { count: 0 }
const update = () => {
  patch(
    n('div', [
      n('span', state.count),
      n('button', {
        click: () => {
          state.count++
          update()
        },
      }, 'add')
    ]),
  )
}

update()
```

As you can read above, update re-renders the view with the current value of `state.count` whenever the button is clicked. Despite patch being stateless, it allows you to control state externally and reapply the patches as needed.

### Keys

Use a `key` attribute to associate an abstract node with the same DOM element across updates. Keys are useful when reordering stateful elements such as inputs. The key is reconciliation metadata and is not written to the DOM.

```JavaScript
patch(
  n('ul', items.map((item) =>
    n('li', {
      key: item.id,
    }, item.label),
  )),
)
```

Keys must be unique among siblings. When keyed children change order, staark patch moves their existing DOM elements instead of repurposing elements at the same positions.

There is also a second parameter for the `prepare` function. This can be the abstract node tree corresponding to existing HTML, typically rendered on the server and provided to the client. See [staark isomorphic](https://github.com/doars/staark/tree/main/packages/staark-isomorphic#readme) for more information. If the existing abstract node tree is a string, it is automatically parsed as JSON. When no tree is supplied, the root's existing children are converted into the initial abstract tree.

The full build also exports `conditional`, `factory`, `fctory`, `identifier`, `match`, and `nde`, so they do not have to be imported from Staark separately. The `memo` function is intentionally not exported because the stateless patcher has no state to provide to memo render functions.

## Installation

Via NPM

```ZSH
npm install @doars/staark-patch
```

IIFE build via a CDN

```HTML
<!-- Base bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.base.iife.js"></script>
<!-- Base bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.base.iife.min.js"></script>
<!-- Full bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.iife.js"></script>
<!-- Full bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.iife.min.js"></script>
```

ESM build via a CDN

```JavaScript
// Base bundle.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.base.js'
// Base bundle minified.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.base.min.js'
// Full bundle.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.js'
// Full bundle minified.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.min.js'
```

For compact language-model documentation, see [`llms.txt`](./llms.txt).
