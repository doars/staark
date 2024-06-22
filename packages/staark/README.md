# staark

A easy to understand front-end library coming in at less than two kilobytes when compressed. To get you up and running you only need to know two functions: `mount` and `node`. There are a few more but lets go over the basics first.

With `mount` you attach the application to the document, provide the application with a render function, and an initial state. With `node` you create, well an abstract representation of a [node](https://developer.mozilla.org/docs/Web/API/Node) for the application to render.

```JavaScript
import { mount, node, view } from '@doars/staark'

mount(
  (state) => node('div', [
    node('span', state.count),
    node('button', {
      click: () => state.count++,
    }, 'add')
  ]),
  { count: 0 },
  document.body.firstSibling,
)
```

Of course there is always more to a front-end framework to help you out. There is a `memo` function for using [memoization](https://wikipedia.org/wiki/Memoization) to optimize a time costly operation.

```Javascript
import { memo, mount, node } from '@doars/staark'

mount(
  (state) => node('div', [
    node('span', state.count),
    node('button', {
      click: () => state.count++,
    }, 'add'),

    memo(
      () => count / 2,
      count % 3 === 0,
    ),
  ]),
  { count: 0 },
  document.body.firstSibling,
)
```

In the example above the text will always be shown. However it only updates when the number changes from divisible by three to not divisible by three, and vice versa. This is because the value of the second argument will change from `true` to `false`. The second argument can of course be anything even a deeply nested object.

All the functions above are part of the base library there is an expanded version which has a bit more non-essential functionality to make development simpler. One of which is the `factory` object, it can make creating nodes a little simpler. You can deconstruct it to create `node` function which don't need the node type as the first argument.

```JavaScript
import { factory, mount, view } from '@doars/staark'
const { button, div, span } = factory

mount(
  (state) => div([
    span(state.count),
    button({
      click: () => state.count++,
    }, 'add')
  ]),
  { count: 0 },
  document.body.firstSibling,
)
```

Then there is the `nde` function. It allows you to create a node using a query selector instead of a node type and attributes object.

```JavaScript
import { mount, nde } from '@doars/staark'

mount(
  nde('a.nav-link.active[href="/next-page/"][target=_blank]', 'Next page'),
  document.body.firstSibling,
)
```

As you can probably guess there is also a `fctory` object, which is a combination of the `factory` object and `ndo` function. You can deconstruct it to create node functions where you do not have to specify the node type and can write the attributes as a query selector.

```JavaScript
import { fctory, mount } from '@doars/staark'
const { a } = fctory

mount(
  a('.nav-link.active[href="/next-page/"][target=_blank]', 'Next page'),
  document.body.firstSibling,
)
```

In addition to the functions and objects provided it is good to know that some attribute properties are treated differently. As you have probably noticed in the examples above a function gets added as a listener making reactivity easy to handle. The `class` and `style` are also handled differently, the value of attributes with that name are automatically converted from arrays or objects to a single string.

```JavaScript
let attributes = {
  class: [
    'nav-link',
    'active',
  ],
  style: [
    'color: red',
    'text-decoration: underline',
  ],
} // Will become <... class=".nav-link .active" style="color:red;text-decoration:underline;">
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
```

As you can see in the example above the style properties are automatically converted from camel case to kebab case. This is not done for class names since capital letters could be intended.

And well, that is everything you need to know about the library in order to be an expert at using _staark_!

## Ideas

- Store the state of the application in the browsers local storage and try to resume from there on page reload.
- Create a server side rendering function and and a client-side re-hydration function.
