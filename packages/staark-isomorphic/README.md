# staark isomorphic

A server side rendering library for [staark](https://github.com/doars/staark/tree/main/packages/staark#readme). It provides methods to convert a staark abstract node tree into a string, making it excellent for server-side rendering (SSR) and static site generation (SSG).

You have two primary functions at your disposal `stringify` and `stringifyFull`. These functions allow the application state and abstract node tree to be rendered to strings. Let’s walk through how each of these functions can be used effectively.

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

console.log(html) // '<div><span>0</span><button>add</button></div>'
console.log(tree) // [...]
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

console.log(html) // '<div><span>0</span><button>add</button></div>'
console.log(tree) // '[...]'
console.log(state) // '{"count":0}'
```

The added benefit of stringify the abstract node tree and state is that this can also be passed to [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) the front-end for re-hydration alongside the rendered HTML.

```HTML
<body>
  <div id="app">
    <div><span>0</span><button>add</button></div>
  </div>

  <script type="module">
    import { mount, node as n } from '@doars/staark'

    const stringifiedTree = '[...]'
    const stringifiedState = '{"count":0}'

    mount(
      document.body.querySelector('#app'),
      (state) => n('div', [
        n('span', state.count),
        n('button', {
          click: () => state.count++,
        }, 'add')
      ]),
      stringifiedState,
      stringifiedTree,
    )
  </script>
</body>
```

If you don't care about the state because you might be using your own state solution then you'll only need the rendered abstract node tree. Well there are two functions specially made for this, the `stringifyPatch` and `stringifyPatchFull` functions. The difference between these and the previous two are that the first parameter is the abstract node tree that would be returned by the render function and that there is no second parameter for providing the state.

```JS
import { node as n, stringifyPatch } from '@doars/staark-isomorphic'

const [html, tree] = stringifyPatch(
  n('div', [
    n('p', 'Hello there'),
    n('p', 'General Kenobi'),
  ]),
)

console.log(html) // '<div><p>Hello there</p><p>General Kenobi</p></div>'
console.log(tree) // [...]
```

And of course the `stringifyPatchFull` function will render not just the abstract node tree but stringify it as well.

```JS
import { node as n, stringifyPatchFull } from '@doars/staark-isomorphic'

const [html, tree] = stringifyPatchFull(
  n('div', [
    n('p', 'Hello there'),
    n('p', 'General Kenobi'),
  ]),
)

console.log(html) // '<div><p>Hello there</p><p>General Kenobi</p></div>'
console.log(tree) // '[...]'
```

As mentioned before the `stringifyPatch` and `stringifyPatchFull` functions are ideal to re-hydrate this can be done with [staark-patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme).

```HTML
<body>
  <div id="app">
    <div><p>Hello there</p><p>General Kenobi</p></div>
  </div>

  <script type="module">
    import { node as n, prepare } from '@doars/staark-patch'

    const stringifiedTree = '[...]'

    const patch = prepare(
      document.body.querySelector('#app'),
      stringifiedTree,
    )

    patch(
      n('div', [
        n('p', 'Hello there'),
        n('p', 'General Kenobi'),
      ]),
    )
  </script>
</body>
```

The library also exports the `factory`, `fctory`, `memo`, `nde`, and `text` functions from staark so these don't have te imported from there separately. But do note that `stringifyPatch` and `stringifyPatchFull` do not support the `memo` node since there is no state to provide to these memoization functions.

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
import { stringify } from 'https://cdn.jsdelivr.net/npm/@doars/staark-isomorphic@1/dst/staark-isomorphic.js'
// Bundle minified.
import { stringify } from 'https://cdn.jsdelivr.net/npm/@doars/staark-isomorphic@1/dst/staark-isomorphic.min.js'
```
