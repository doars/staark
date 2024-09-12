# staark isomorphic

A server side rendering library for [staark](https://github.com/doars/staark#readme). It provides methods to convert a staark virtual DOM into a string, making it suitable for server-side rendering (SSR) and static site generation (SSG).

You have two primary functions at your disposal `stringify` and `stringifyFull`. These functions allow the application state and DOM tree to be rendered to strings. Let’s walk through how each of these functions can be used effectively.

The `stringify` function is your gateway to converting your application’s view into a static HTML string. This is particularly useful for generating the initial HTML on the server before sending it to the client. It takes in two parameters a `view` function that takes in the `state` and outputs the abstract node tree, and optionally an initial `state` object that your application starts with. When you call `stringify`, it returns an array with two elements, firstly the rendered HTML as a string, as well as the abstract node tree.

```JS
import { node as n, stringify } from '@doars/staark-isomorphic'

const [html, tree] = stringify(
  (state) => n('div', [
    n('span', state.count),
    n('button', {
      click: () => state.count++,
    }, 'add')
  ]),
  { count: 0 },
)

console.log(html) // <div><span>0</span><button>add</button></div>
```

The `stringifyFull` function goes a step further by not only rendering your view to a static HTML string but also serializing the abstract node tree and the entire application state. This is particularly useful when you need to transfer the initial state and abstract node structure from server to client. It takes in two parameters a `view` function that takes in the `state` and outputs the abstract node tree, and optionally an initial `state` object that your application starts with. When you call `stringifyFull`, it returns an array with three elements, firstly the rendered HTML as a string, as well as the serialized abstract node tree, and finally the serialized initial state.

```JS
import { node as n, stringifyFull } from '@doars/staark-isomorphic'

const [html, tree, state] = stringifyFull(
  (state) => n('div', [
    n('span', state.count),
    n('button', {
      click: () => state.count++,
    }, 'add')
  ]),
  { count: 0 },
)

console.log(html) // <div><span>0</span><button>add</button></div>
console.log(tree)
console.log(state) // {"count":0}
```

## Installation

Via NPM

```ZSH
npm install @doars/staark-isomorphic
```

IIFE build via a CDN

```HTML
<!-- Bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-isomorphic@1/dst/staark-isomorphic.iife.js"></script>
<!-- Bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark-isomorphic@1/dst/staark-isomorphic.iife.min.js"></script>
```

ESM build via a CDN

```JS
// Bundle.
import { stringify, stringifyFull } from 'https://cdn.jsdelivr.net/npm/@doars/staark-isomorphic@1/dst/staark-isomorphic.js'
// Bundle minified.
import { stringify, stringifyFull } from 'https://cdn.jsdelivr.net/npm/@doars/staark-isomorphic@1/dst/staark-isomorphic.min.js'
```
