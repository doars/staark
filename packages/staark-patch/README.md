# staark patch

A teeny-tiny stateless framework for building web apps.

- Minimal amount of concepts to learn in order to get going, meaning the system becomes incredibly **easy to reason with**.
- Comes in at **a kilobyte** in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has an **efficient diffing algorithm**. This ensures the node tree is morphed quickly from the old to the new with minimal overhead.
- Written in TypeScript.

> Looking for one with a state management solution checkout out [staark](https://github.com/doars/staark/tree/main/packages/staark#readme).

To use staark patch, you need to know two main functions the `prepare` and `node`. With `prepare`, you set up the `patch` function, which will update a section of the node tree based on new abstract node tree you provide. The `node` function creates those abstract representations of document elements, which staark patch uses to manipulate the actual document.

```JS
import { node as n, prepare } from '@doars/staark-patch'

const patch = prepare(
  document.body.firstSibling,
)

patch(
  n('div', [
    n('p', 'Hello there'),
    n('p', 'General Kenobi'),
  ]),
)
```

The `prepare` function attaches the `patch` function to the document’s first sibling. The `patch` function is then used to apply a simple view of two paragraphs into the document. Every time `patch` is called, the document updates based on the new nodes passed to it.

Even though patch is stateless, you can still use it for dynamic updates by manually handling state changes within your code. The library provides an easy and efficient way to re-render parts of your document when you modify your data.

```JS
import { node as n, prepare } from '@doars/staark-patch'

const patch = prepare(
  document.body.firstSibling,
)

const state = {}
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
```

As you can read above, update re-renders the view with the current value of `state.count` whenever the button is clicked. Despite patch being stateless, it allows you to control state externally and reapply the patches as needed.

Then there is also another second parameter for the `prepare` function. This parameter can be the abstract node tree of the existing HTML. Typically rendered on the server and the provided to the client. See the [staark isomorphic](https://github.com/doars/staark/tree/main/packages/staark-isomorphic#readme) package for more in formation on this. And also important to note to make it easier, if the existing abstract node tree is a string it will automatically be parsed as JSON.

The full build of the library also exports the `factory`, `fctory`, and `nde` functions from staark so these don't have te imported from there separately. And do note that the `memo` function is not exported because this is not supported since there is no state to provide to these memoization functions.

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

```JS
// Base bundle.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.base.js'
// Base bundle minified.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.base.min.js'
// Full bundle.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.js'
// Full bundle minified.
import { node as n, prepare } from 'https://cdn.jsdelivr.net/npm/@doars/staark-patch@1/dst/staark-patch.min.js'
```
