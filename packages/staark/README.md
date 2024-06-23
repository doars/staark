# Staark

A teeny-tiny framework for building web apps.

- Minimal amount of concepts to learn in order to get going, meaning the system becomes incredibly *easy to reason with*.
- Comes in at about *a kilobyte and half* in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has an *efficient diffing algorithm*. This ensures the dom is morphed quickly from the old to the new state with minimal overhead.
- Utilises a proxy to manage the application state, the view is therefore only updated on changing the state, and can also be manipulated outside of event listeners.

To get you up and running you only need to know two functions: `mount` and `node`. There are a few more but lets go over the basics first. With `mount` you attach the application to the document, by providing it with a node from the document, a view function, and optionally an initial state. The view function takes in the state and outputs an abstract representation of the document using the `node` function. With `node` you create an abstract representation of a single [node](https://developer.mozilla.org/docs/Web/API/Node). The library then takes these nodes returned by the view function and creates the actual document for the browser to render.

```JavaScript
import { mount, node } from '@doars/staark'

mount(
  document.body.firstSibling,
  (state) => node('div', [
    node('span', state.count),
    node('button', {
      click: () => state.count++,
    }, 'add')
  ]),
  { count: 0 },
)
```

Of course there is always more to a front-end framework to help you out. There is a `memo` function for using [memoization](https://wikipedia.org/wiki/Memoization) to optimize time costly operations. The function takes in a view function and a state. Only if the state has changed will the view function be called again, otherwise an earlier copy still in memory will be returned.

```Javascript
import { memo, mount, node } from '@doars/staark'

const halfCount = (state) => node('span', state.count / 2)

mount(
  document.body.firstSibling,
  (state) => node('div', [
    node('span', state.count),
    node('button', {
      click: () => state.count++,
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

In addition to the functions provided it is good to know that some attribute properties are treated differently. As you have probably noticed in the examples above a function gets added as a listener making reactivity easy to handle. The `class` and `style` are also handled differently, the value of attributes with that name are automatically converted from arrays or objects to a single string.

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

All the functionality above is part of the base library there is an expanded version which has a bit more non-essential functionality to make development simpler. One of which is the `factory` object, it can make creating nodes a little simpler. You can deconstruct it to create `node` function which don't need the node type as the first argument.

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

Finally we come to the last two functions you can use. These aren't imported, but returned by the `mount` function. An `update` and `unmount` function. These can be deconstructed from a list, where the first value is the `update` and the second the `unmount` function. As the names suggest, with the `update` function a re-rendering can be forced, and with the `unmount` function the application can be terminated after which it will be removed from the page.

```JavaScript
import { mount, node } from '@doars/staark'

const [update, unmount] = mount(
  document.body.firstSibling,
  () => node('div'),
)

update()
unmount()
```

And well, that is everything you need to know about the library in order to be an expert at using _staark_!

## Installation

```ZSH
npm install @doars/staark
```

## Known issues

- A `memo` function inside a `memo` function isn't going to see the benefits of memoization. After an update any memoized calls that haven't been used will be cleared from memory. This means that if the outer `memo` function was used the inner call's data will be culled, as a result during the next update when it might be needed the data will have already been lost. It is therefore not recommended to use `memo` function inside of one another. The library will of course still handle everything as intended, there just won't the performance boost you might be hoping for.
