# staark

A teeny-tiny framework for building web apps.

- Minimal amount of concepts to learn in order to get going, meaning the system becomes incredibly **easy to reason with**.
- Comes in at **a kilobyte and half** in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has an **efficient diffing algorithm**. This ensures the node tree is morphed quickly from the old to the new with minimal overhead.
- Utilises a proxy to manage the application state, the view is therefore **only updated on changing** the state, and can also be manipulated outside of event listeners.
- Written in TypeScript.

To get you up and running you only need to know two functions: `mount` and `node`. There are a few more but lets go over the basics first. With `mount` you attach the application to the document, by providing it with a node from the document, a view function, and optionally an initial state. The view function takes in the state and outputs an abstract representation of the document using the `node` function. With `node` you create an abstract representation of a single [node](https://developer.mozilla.org/docs/Web/API/Node). The library then takes these nodes returned by the view function and creates the actual document for the browser to render.

```JavaScript
import { mount, node as n } from '@doars/staark'

mount(
  document.body.firstSibling,
  (state) => n('div', [
    n('span', state.count),
    n('button', {
      click: () => state.count++,
    }, 'add')
  ]),
  { count: 0 },
)
```

Of course there is always more to a front-end framework to help you out. There is a `memo` function for using [memoization](https://wikipedia.org/wiki/Memoization) to optimize time costly operations. The function takes in a view function and a state. Only if the state has changed will the view function be called again, otherwise an earlier copy still in memory will be returned.

```Javascript
import { memo, mount, node as n } from '@doars/staark'

const halfCount = (state) => n('span', state.count / 2)
const incrementCount = (event, state) => state.count++

mount(
  document.body.firstSibling,
  (state) => n('div', [
    n('span', state.count),
    n('button', {
      click: incrementCount,
    }, 'add'),

    memo(
      halfCount,
      state.count % 3 === 0,
    ),
  ]),
  { count: 0 },
)
```

In the example above the text will always be shown. However it only updates when the number changes from divisible by three to not divisible by three, and vice versa. This is because the value of the second argument will change from `true` to `false`. The second argument can of course be anything even a deeply nested object. But do note that the function is not defined within the view function, instead it is defined earlier outside of it. This allows it to have a unique and static identifier as well as be pure separately from the rest of the application.

Also note how the click listener has been extracted outside of the view function. This can be done because the first parameter is the event like in vanilla javascript and the second parameter of a function is the state. Extracting the listener is beneficial as it will always remove and re-add the same listener when defined inside the view function. This happens because in JavaScript a new function is always different when re-defined and can't be compared against. For example `{} === {}` results in `true`, but `(() => {}) === (() => {})` is always `false`.

In addition to the functions provided it is good to know that some attribute properties are treated differently. As you have probably noticed in the examples above a function gets added as a listener making reactivity easy to handle. The `class` and `style` are also handled differently, the value of attributes with that name are automatically converted from objects to a single string.

```JavaScript
attributes = {
  class: {
    'btn-link': false,
    'nav-link': true,
    active: true,
  },
  style: {
    color: 'red',
    textDecoration: 'underline',
  },
} // Will become <... class=".nav-link .active" style="color:red;text-decoration:underline;">
let attributes = {
  class: [
    'nav-link',
    'active',
  ],
} // Will become <... class=".nav-link .active">
```

As you can see in the example above the style properties are automatically converted from camel case to kebab case. This is not done for class names since capital letters could be intended. Also note that the class can be expressed using an array as well.

All the functionality above is part of the base library there is an expanded version which has a bit more non-essential functionality to make development simpler. The first of these being the `conditional` and `match` functions. These allow you to easily add branching into rendering the node tree. The `conditional` function takes in a statement, if the statement is true the first parameter will be returned, otherwise the second parameter will be returned. For the `match` function the first parameter is the key of one of the entries into the second parameter, the matching one will be returned by the function.

```JavaScript
import { conditional, match, mount, node as n } from '@doars/staark'

mount(
  document.body.firstSibling,
  (state) => n('div', [
    ...conditional(
      state.count === 0,
      'Count is zero',
      'Count is non-zero',
    ),

    ...match('option-' + state.count, {
      'option-0': 'Count is zero',
      'option-1': 'Count is one',
      'option-2': 'Count is three',
    }),
  ]),
  { count: 0 },
)
```

The returned results are always an array, hence the spread operator being used. Optionally the first and second parameters of the `conditional` call, as well as the properties on the `match`'s second parameter are allowed to be functions. These will be evaluated when picked reducing the amount of wasted abstract nodes that would otherwise have been created for nothing.

Another useful tool is the `factory` object, it can make creating nodes a little simpler. You can deconstruct it to create `node` function which don't need the node type as the first argument.

```JavaScript
import { factory, mount } from '@doars/staark'
const { button, div, span } = factory

mount(
  document.body.firstSibling,
  (state) => div([
    span(state.count),
    button({
      click: () => state.count++,
    }, 'add')
  ]),
  { count: 0 },
)
```

Then there is the `nde` function. It allows you to create a node using a query selector instead of a node type and attributes object.

```JavaScript
import { mount, nde } from '@doars/staark'

mount(
  document.body.firstSibling,
  () => nde('a.nav-link.active[href="/next-page/"][target=_blank]', 'Next page'),
)
```

As you can probably guess there is also a `fctory` object, which is a combination of the `factory` object and `ndo` function. You can deconstruct it to create node functions where you do not have to specify the node type and can write the attributes as a query selector.

```JavaScript
import { fctory, mount } from '@doars/staark'
const { a } = fctory

mount(
  document.body.firstSibling,
  () => a('.nav-link.active[href="/next-page/"][target=_blank]', 'Next page'),
)
```

Now we come to the two more functions needed to stop or update the application. These aren't imported, but returned by the `mount` function. An `update` and `unmount` function. These can be deconstructed from a list, where the first value is the `update` and the second the `unmount` function. As the names suggest, with the `update` function a re-rendering can be forced, and with the `unmount` function the application can be terminated after which it will be removed from the page.

```JavaScript
import { mount, node as n } from '@doars/staark'

const [update, unmount] = mount(
  document.body.firstSibling,
  () => n('div'),
)

update()
unmount()
```

Last but not least there is the second way to provide and mutate the state. This will be primarily done inside the app, but sometimes data from outside needs to be passed into the app. This can be done using the third argument and third value returned by the `mount` function. The third argument can be a recursive proxy in which case it is up to you to invoke the update function once a re-render needs to be done.

```JavaScript
import { mount, node as n } from '@doars/staark'

const proxy = new Proxy({
  count: 1,
}, {})

const [update, unmount] = mount(
  document.body.firstSibling,
  (state) => n('div', state.count),
  proxy,
)
```

Another method to influence the state outside the app is using the third value returned, which is the `state` proxy used by the app. This is the same proxy that the render function receives and as such can be manipulated similarly. Having the state available outside of the view function allows you to do some nifty things. For instance in the example below the viewport width is used inside the application, and updated when the window changes size.

```JavaScript
import { mount, node as n } from '@doars/staark'

const [update, unmount, state] = mount(
  document.body.firstSibling,
  (state) => n('div', state.width),
  { width: window.innerWidth, },
)

window.addEventListener('resize', () => {
  state.width = window.innerWidth
})
```

Then there is also another fourth parameter for the `mount` function. This parameter can be the abstract node tree of the existing HTML. Typically rendered on the server and the provided to the client. See the [staark isomorphic](https://github.com/doars/staark/tree/main/packages/staark-isomorphic#readme) package for more in formation on this. And also important to note to make it easier, if the `state` or existing abstract node tree is a string it will automatically be parsed as JSON.

And well, that is everything you need to know about _staark_ in order to be an expert at using it!

## Installation

Via NPM

```ZSH
npm install @doars/staark
```

IIFE build via a CDN

```HTML
<!-- Base bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.base.iife.js"></script>
<!-- Base bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.base.iife.min.js"></script>
<!-- Full bundle -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.iife.js"></script>
<!-- Full bundle minified -->
<script src="https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.iife.min.js"></script>
```

ESM build via a CDN

```JavaScript
// Base bundle.
import { mount, node as n } from 'https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.base.js'
// Base bundle minified.
import { mount, node as n } from 'https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.base.min.js'
// Full bundle.
import { mount, node as n } from 'https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.js'
// Full bundle minified.
import { mount, node as n } from 'https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.min.js'
```

## Known issues

- A `memo` function inside a `memo` function isn't going to see the benefits of memoization. After an update any memoized calls that haven't been used will be cleared from memory. This means that if the outer `memo` function was used the inner call's data will be culled, as a result during the next update when it might be needed the data will have already been lost. It is therefore not recommended to use `memo` function inside of one another. The library will of course still handle everything as intended, there just won't the performance boost you might be hoping for.

## Artificial intelligence

To make prompting easier you can use the contents of the [AI.md](https://github.com/doars/staark/blob/main/packages/staark/AI.md) file to give a model all the context required to build apps with staark. If you are only using the base build be sure to only include the first sections, or add the fact that you are only using the base build to the prompt context.
