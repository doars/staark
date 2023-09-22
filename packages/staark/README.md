# staark

A easy to understand front-end library coming in at less than two kilobytes when compressed. To get you up and running you only need to know three functions: `mount`, `node`, and `view`. There are a few more but lets go over the basics first.

With `mount` you attach the application to the document. With `node` you create, well an abstract representation of a [node](https://developer.mozilla.org/docs/Web/API/Node) for the document. And you can use the `view` function to create a component with its own state and render function that controls the nodes it returns.

```JavaScript
import { mount, node, view } from '@doars/staark'

mount(
  view(
    'root',
    (state) => node('div', [
      node('span', state.count),
      node('button', {
        click: () => state.count++,
      }, 'add')
    ]),
    { count: 0 },
  ),
  document.body.firstSibling,
)
```

Then what is the catch? Well you need to provide the view functions with a key. Which doesn't sound that bad. Unfortunately the keys leading up a view must be unique. Have a look at the sample below. In order for it to work one, or both, of the keys need to be changed otherwise two views will have the path `root/field` associated with it. For instance it could be changed to `root/field-name` and `root/field-email`.

```JavaScript
import { mount, node, view } from '@doars/staark'

mount(
  view(
    'root',
    () => node('div', [
      view(
        'field',
        () => node('input', {
          name: 'name'
        }),
      ),
      view(
        'field',
        () => node('input', {
          name: 'email',
          type: 'email'
        },)
      ),
    ]),
  ),
  document.body.firstSibling,
)
```

Of course there is always more to a front-end framework to help you out. There is a `text` function for explicitly creating [text](https://developer.mozilla.org/docs/Web/API/Text) nodes, as well as a `memo` function for using [memoization](https://wikipedia.org/wiki/Memoization) to optimize a time costly operation.

```Javascript
import { memo, mount, node, text, view } from '@doars/staark'

mount(
  view(
    'root',
    (state) => node('div', [
      node('span', state.count),
      node('button', {
        click: () => state.count++,
      }, 'add'),

      memo(
        'count',
        count % 3 === 0,
        () => text(count / 2),
      ),
    ]),
    { count: 0 },
  ),
  document.body.firstSibling,
)
```

In the example above the text will always be shown. However it only updates when the number changes from divisible by three to not divisible by three, and vice versa. This is because the value of the second argument will change from `true` to `false`. The second argument can of course be anything even a deeply nested object.

All the functions above are part of the base library there is an expanded version which has a bit more non-essential functionality to make development simpler, but increases the library to four kilobytes when compressed. It includes the `factory` and `fctory` object as well as the `nde` function.

The `factory` object can make creating nodes a little simpeler. You can deconstruct it to create node function which don't need the node type as the first argument.

```JavaScript
import { factory, mount, view } from '@doars/staark'
const { button, div, span } = factory

mount(
  view(
    'root',
    (state) => div([
      span(state.count),
      button({
        click: () => state.count++,
      }, 'add')
    ]),
    { count: 0 },
  ),
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

And as you can probably guess the `fctory` object is a combination of the `factory` object and `ndo` function. You can deconstruct it to create node functions where you do not have to specify the node type and can write the attributes as a query selector.

```JavaScript
import { fctory, mount } from '@doars/staark'
const { a } = fctory

mount(
  a('.nav-link.active[href="/next-page/"][target=_blank]', 'Next page'),
  document.body.firstSibling,
)
```

In addition to the functions and objects provided it is good to know that some attribute properties are treated differently. As you have probably noticed in the examples above a function gets added as a listener. The `class` and `style` are automatically converted from arrays or objects to a single string.

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
}
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
}
```

As you can see in the example above the style properties are automatically converted from camel case to kebab case. This is not done for class names since capitals could be intended.

And well, that is everything you need to know about the library in order to be an expert at using _staark_!

## Ideas

- Store the state of the application in the browsers local storage and try to resume from there on page reload.
- Create a server side rendering function and and a client-side re-hydration function.
