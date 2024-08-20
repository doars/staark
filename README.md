# staark

A teeny-tiny framework for building web apps.

- Minimal amount of concepts to learn in order to get going, meaning the system becomes incredibly *easy to reason with*.
- Comes in at about *a kilobyte and half* in size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.
- Has an *efficient diffing algorithm*. This ensures the dom is morphed quickly from the old to the new state with minimal overhead.
- Utilises a proxy to manage the application state, the view is therefore only updated on changing the state, and can also be manipulated outside of event listeners.

## Packages

For all the details on the core library see the package's own [README](https://github.com/doars/staark/tree/main/packages/staark#readme) first. In addition there are other packages part of this repository to help you with the development of your application.

- [`@doars/staark-components`](https://github.com/doars/staark/tree/main/packages/staark-components#readme) a set of components, and a great example for seeing the core library in action.
- [`@doars/staark-isomorphic`](https://github.com/doars/staark/tree/main/packages/staark-isomorphic#readme) a version that can used in both the client and the server for rendering a view.
- [`@doars/tiedliene`](https://github.com/doars/staark/tree/main/packages/tiedliene#readme) a teensy-tiny library for managing state diffs.
- [`@doars/vroagn`](https://github.com/doars/staark/tree/main/packages/vroagn#readme) a teensy-tiny library for managing network requests.

## Contributing

If you are using the library and are running into an problem that you don't know how to solve, or would love to see a particular feature then feel free to [create an issue](https://github.com/doars/staark/issues/new/choose).

## In the wild

If you are using staark then please [let me know](https://rondekker.com#contact), I would love to hear about it!

## Compared to Hyperapp

[Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) is a similar library that offers almost the same functionality with some exceptions. Out of the box it does not have the `factory`, `fctory`, and `nde` function, although these could be added as wrappers. Hyperapp also doesn't handle `class` and `style` attributes the same way, but the biggest difference is in how you as the user make changes to the state. Hyperapp expects you to return a new copy of the state with the modified made as the return of a listener. This means only listeners can easily mutate the state at the end of the function. staark on the other had allows mutation of any key on the state no matter when. The library will after a change has been made re-render the application. This means that you can comfortably use asynchronous functions such [fetch](https://github.com/doars/staark/tree/main/packages/vroagn#readme) and have staark automatically update the interface afterwards.

### File size

Compared to Hyperapp using the same build configuration Hyperapp is 13% larger than the base build of staark which has an equivalent feature set. Both builds have been produced using the same configuration and were compressed before comparing them.

### Performance

To give an indication how staark performs I tried writing a simple, probably flawed, benchmark that pushes items onto a list similar to a todo app. I expected it to be slower than Hyperapp because it does not uses proxies for state management, which is typically slower. Oddly enough the results indicate staark being over fifteen times faster than Hyperapp. I have so far been unable to pinpoint the exact reason why. See the [benchmarks directory](https://github.com/doars/staark/tree/main/benchmarks) for the code used.

## Future ideas

- Add optional key parameter to the `node` function so some nodes are exempt from being re-used during morphing.
- Document how to deal with listening to window events such as resize.
- Add client-side re-hydration.
- Store the state of the application in the browsers local storage and try to resume from there on page reload.

## License

[MIT](/LICENSE)
