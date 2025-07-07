<div align="center">

![Project logo](assets/icons/256-round.png)

</div>

# staark

A set of teeny-tiny libraries for building web apps. The goal of this toolkit is as follows:

- Minimal amount of concepts to learn in order to get going, meaning the system becomes incredibly *easy to reason with*.
- Comes in at a miniscule size when compressed. Due to the minimal philosophy of the library and the simple concepts within the total size is tiny as well.

## Packages

This mono repository contains several packages, see the overview below:

- [`@doars/staark`](https://github.com/doars/staark/tree/main/packages/staark#readme) a teensy-tiny library for for building web apps.
- [`@doars/staark-isomorphic`](https://github.com/doars/staark/tree/main/packages/staark-isomorphic#readme) a version of staark that can used on the server for rendering a view.
- [`@doars/staark-patch`](https://github.com/doars/staark/tree/main/packages/staark-patch#readme) a version of staark without state management where the node tree is repeatedly patched.
- [`@doars/tiedliene`](https://github.com/doars/staark/tree/main/packages/tiedliene#readme) a teensy-tiny library for managing state diffs.
- [`@doars/vroagn`](https://github.com/doars/staark/tree/main/packages/vroagn#readme) a teensy-tiny library for managing network requests.

## Contributing

If you are using the libraries and are running into an problem that you don't know how to solve, or would love to see a particular feature then feel free to [create an issue](https://github.com/doars/staark/issues/new/choose).

## In the wild

- [Toaln](https://github.com/RedKenrok/webapp-toaln#readme) is a simple language learning app which utilises the power of Large Language Models to practise.
- [Tools by Ron Dekker](https://rondekker.nl/en-gb/tools/) are a set of widgets whose functions range from colour conversion to text analysis.

If you are using _staark_ then please let me know, I would love to hear about it!

## Comparisons

Curious how _staark_ compares to other similar libraries? Checkout the [performance](https://github.com/doars/staark/tree/main/performance#readme) directory where it's compared to some other libraries in build size, runtime performance, and memory usage. As a bonus the difference and similarities are also explained for some.

## Future ideas

- How can the state of the app work together with the browser's IndexedDB API?
- Add support for `memo` nodes to `staark-patch` and `staark-isomorphic`'s patch functions.
- Lifecycle hooks for reacting to when nodes are first created, or an attribute is updated, or removed from the DOM.
- Have the CSV importer of `vroagn` automatically check for the delimiter.
- Add optional key parameter to the `node` function so some nodes are exempt from being re-used during morphing.

## License

[MIT](/LICENSE)
