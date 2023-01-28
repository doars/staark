# staark

A easy to understand front-end library coming in at less than two kilobytes when compressed. To get you up and running you only need to know three functions: `app`, `node`, and `view`. There are a few more but lets go over the basics first.

With `app` you attach the application to the document. With `node` you create, well an abstract representation of a [node](https://developer.mozilla.org/docs/Web/API/Node) for the document. And you can use the `view` function to create a component with its own state and render function that controls the nodes it returns.

```JavaScript
import { app, node, view } from '@doars/staark'

app(
  document.body.firstSibling,
  view(
    'root',
    (state) => node('div', [
      node('span', state.count),
      node('button', {
        click: () => state.count++,
      }, 'add')
    ]),
    { count: 0 }
  )
)
```

Of course there is always more to it. There is a `text` function for explicitly creating [text](https://developer.mozilla.org/docs/Web/API/Text) nodes, as well as a `memo` function for using [memoization](https://wikipedia.org/wiki/Memoization) to optimize an time costly operation.

```Javascript
import { app, memo, node, text, view } from '@doars/staark'

app(
  document.body.firstSibling,
  view(
    'root',
    (state) => node('div', [
      node('span', state.count),
      node('button', {
        click: () => state.count++,
      }, 'add'),

      memo(
        () => text(count / 2),
        count % 3 === 0
      )
    ]),
    { count: 0 }
  )
)
```

In the example above the text will always be shown. However it only updates when the number changes from divisible by three to not divisible by three, and vice versa. This is because the value of the second argument will change from `true` to `false`. The second argument can of course be anything even a deeply nested object.

Then there is the `factory` object to make creating nodes a little simpeler. You can deconstruct it to create node function which don't need the node type as the first parameter.

```JavaScript
import { app, factory, view } from '@doars/staark'
const { button, div, span } = factory

app(
  document.body.firstSibling,
  view(
    'root',
    (state) => div([
      span(state.count),
      button({
        click: () => state.count++,
      }, 'add')
    ]),
    { count: 0 }
  )
)
```

In the example above you can see that the `node` function has been replace with tag specific functions. And the `active` class of the `h1` as well as the `background-color` of the `span` depend on the `active` state.

Well then what is the catch? Unfortunately you need to provided the view functions, which doesn't sound that hard. The keys however leading up a view must be unique. Have a look at the sample below. In order for it to work one, or both, of the keys need to be changed otherwise two views will have the path `root/field` associated with it. For instance to `root/field-name` and `root/field-email`.

```JavaScript
import { app, node, view } from '@doars/staark'

app(
  document.body.firstSibling,
  view(
    'root',
    () => node('div', [
      view(
        'field',
        () => node('input', {
          name: 'name'
        })
      ),
      view(
        'field',
        () => node('input', {
          name: 'email',
          type: 'email'
        })
      )
    ])
  )
)
```

And that is it. You now know everything in order to be an expert at using staark. For more details on the core library see the package's own [README](https://github.com/doars/staark/tree/main/packages/staark#readme).

In addition to the core package there are other packages part of this repository to help you with the development of your application.

- [`@doars/staark-components`](https://github.com/doars/staark/tree/main/packages/staark-components#readme) is a set of components you can easily add to your project, and it serves as a great of example of the core library in action.

## Contributing

If you are using the library and are running into an problem that you don't know how to solve, or would love to see a particular feature then feel free to [create an issue](https://github.com/doars/staark/issues/new/choose).

## In the wild

If you are using Staark then please [let me know](https://rondekker.com#contact), I would love to hear about it!
