# Staark

A teeny-tiny framework for building web apps.

- Minimal amount of concepts to learn in order to get going, meaning the system becomes incredibly *easy to reason with*.
- Comes in at about *a kilobyte and half* in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has an *efficient diffing algorithm*. This ensures the dom is morphed quickly from the old to the new state with minimal overhead.
- Utilises a proxy to manage the application state, the view is therefore only updated on changing the state, and can also be manipulated outside of event listeners.

## Packages

For all the details on the core library see the package's own [README](https://github.com/doars/staark/tree/main/packages/staark#readme) first. In addition there are other packages part of this repository to help you with the development of your application.

- [`@doars/staark-components`](https://github.com/doars/staark/tree/main/packages/staark-components#readme) is a set of components you can easily add to your project, and it serves as a great set of examples for seeing the core library in action.

## Contributing

If you are using the library and are running into an problem that you don't know how to solve, or would love to see a particular feature then feel free to [create an issue](https://github.com/doars/staark/issues/new/choose).

## In the wild

If you are using Staark then please [let me know](https://rondekker.com#contact), I would love to hear about it!

## Compared to Hyperapp

[Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) is a similar library that offers almost the same functionality with some exceptions. Out of the box it does not have the `factory`, `fctory`, and `nde` function, although these could be added as wrappers. Hyperapp also doesn't handle `class` and `style` attributes the same way, but the biggest difference is in how you as the user make changes to the state. Hyperapp expects you to return a new copy of the state with the modified made as the return of a listener. This means only listeners can easily mutate the state at the end of the function. Staark on the other had allows mutation of any key on the state no matter when. The library will after a change has been made re-render the application. This means that you can comfortably use asynchronous functions such fetch and have Staark automatically update the interface afterwards.

## Future ideas

- Keep track of the data read from the proxy when the view function is called. Currently unnecessary re-renders can happen where the state has changed but the change won't have any effect on the results of the view function. By comparing the change's path on the state to a list of used paths the excess re-renders can be prevented.
- Add optional keys to the `node` function so some nodes are exempt from being re-used during morphing.
- Create a server side rendering function and and a client-side re-hydration function.
- Store the state of the application in the browsers local storage and try to resume from there on page reload.

## License

[MIT](/LICENSE)
