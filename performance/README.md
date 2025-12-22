# Performance

I added tests for several libraries to compare their build size, performance, and memory usage to [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) and [staark-patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme). The build size uses the same build and minification process and should all work on the same browser versions, the same as staark is build for by default. In addition the builds are compressed with brotli before their sizes are shown. Performance and memory usage measurements include the average (x̄), lowest measurement (∧), highest measurement (∨), and margin of error (±).

Memory usage is checked in a rather crude manner. Before each iteration the garbage collector is called then the heap size before and after each test is checked and the difference is seen as the "memory used". The downside is that if the garbage collector is called during the test this affects performance greatly and is not shown properly.

## Benchmarks

The performance is measured in two phases. The first is the setup process this is where the library creates the initial app structure. After which the second phase is ran, this phase modifies the state and runs the library to modify the initial app structure into the new desired structure.

### reorder

The `reorder` benchmark creates a list of differing node types and then reorders them. This is done to see how well libraries are able to adjust when node types are changed.

### todo_app

With the `todo_app` there are a thousand rows created and then modified. Simple enough to test how well the app handles adding nodes, modifying texts, and changing attributes over a list of data.

## Libraries

### Hyperapp

[Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) is a similar library to [staark](https://github.com/doars/staark/tree/main/packages/staark#readme). It offers almost the same functionality with some exceptions. Out of the box it does not have the `factory`, `fctory`, and `nde` function, although these could be added as wrappers. Hyperapp also doesn't handle `class` and `style` attributes the same way, but the biggest difference is in how you as the user make changes to the state. Hyperapp expects you to return a new copy of the state with the mutations made as the return of a listener. This means only listeners can easily mutate the state at the end of the event. staark on the other had allows mutation of any key on the state no matter when, it will then after a change has been made re-render the application. This means staark allows you to comfortably use asynchronous functions such [fetch](https://github.com/doars/staark/tree/main/packages/vroagn#readme) and have it automatically update the interface afterwards. And an added bonus of staark is that if an event does not change the state then no re-rendering will happen.

### Incremental DOM

[incremental-dom](https://github.com/google/incremental-dom#readme)

### Mithril

[Mithril](https://github.com/MithrilJS/mithril.js#readme)

### Snabbdom

[Snabbdom](https://github.com/snabbdom/snabbdom#readme) is similar library to [staark patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme) and has many overlapping features. Snabbdom comes with many more, mainly focussed at being the base for your own framework to be build on top, whereas staark patch is only concerned with you brining your own state, since [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) already exists providing a full solution.

### Superfine

[Superfine](https://github.com/jorgebucaran/superfine#readme) can be seen as [Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) without the state management included. This makes it similar to the relation between [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) and [staark patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme).

## Results

### Sizes

Build size for IIFE builds.

```
hyperapp
Minified           3.91KB
Min+gzip           1.90KB    48.51%
Min+brotli         1.71KB    43.75%

incremental-dom
Minified           9.22KB
Min+gzip           3.79KB    41.14%
Min+brotli         3.38KB    36.61%

mithril
Minified          26.00KB
Min+gzip           9.92KB    38.15%
Min+brotli         8.77KB    33.73%

snabbdom
Minified          14.38KB
Min+gzip           5.34KB    37.12%
Min+brotli         4.72KB    32.83%

staark
Minified           3.81KB
Min+gzip           1.82KB    47.92%
Min+brotli         1.62KB    42.48%

staark-patch
Minified           2.56KB
Min+gzip           1.26KB    49.26%
Min+brotli         1.08KB    42.20%

superfine
Minified           2.66KB
Min+gzip           1.33KB    50.09%
Min+brotli         1.19KB    44.73%
```

### reorder

When ran with a complexity of _100_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
snabbdom
- reorder
  Setup time     x̄5.22ms,   ∧4.10ms,  ∨10.70ms,   ±4.20%
  Setup memory   x̄0.23MB,   ∧0.18MB,   ∨1.21MB,  ±14.70%
  Run time       x̄3.63ms,   ∧2.00ms,  ∨17.00ms,   ±9.28%
  Run memory     x̄0.34MB,   ∧0.08MB,   ∨0.81MB,  ±13.19%

staark-patch
- reorder
  Setup time     x̄3.32ms,   ∧2.90ms,   ∨4.70ms,   ±1.82%
  Setup memory   x̄0.17MB,   ∧0.16MB,   ∨0.61MB,   ±7.04%
  Run time       x̄4.48ms,   ∧3.40ms,   ∨6.30ms,   ±2.65%
  Run memory     x̄0.11MB,   ∧0.10MB,   ∨0.11MB,   ±0.27%

superfine
- reorder
  Setup time     x̄3.40ms,   ∧2.90ms,   ∨5.30ms,   ±2.23%
  Setup memory   x̄0.27MB,   ∧0.24MB,   ∨0.74MB,   ±8.37%
  Run time       x̄3.25ms,   ∧2.10ms,   ∨8.90ms,   ±4.89%
  Run memory     x̄0.23MB,   ∧0.19MB,   ∨0.65MB,   ±6.21%
```

### todo_app

When ran with a complexity of _100_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
hyperapp
- todo_app
  Setup time    x̄24.60ms,  ∧16.00ms,  ∨34.80ms,   ±3.46%
  Setup memory   x̄0.99MB,   ∧0.97MB,   ∨1.00MB,   ±0.08%
  Run time      x̄10.12ms,   ∧7.20ms,  ∨26.20ms,  ±10.77%
  Run memory     x̄1.02MB,   ∧1.01MB,   ∨1.04MB,   ±0.18%

incremental-dom
- todo_app
  Setup time    x̄21.78ms,  ∧18.60ms,  ∨26.90ms,   ±1.28%
  Setup memory   x̄1.04MB,   ∧1.03MB,   ∨1.06MB,   ±0.13%
  Run time       x̄5.52ms,   ∧4.80ms,   ∨8.70ms,   ±2.28%
  Run memory     x̄0.55MB,   ∧0.53MB,   ∨0.59MB,   ±0.34%

mithril
- todo_app
  Setup time    x̄20.92ms,  ∧18.80ms,  ∨27.30ms,   ±1.57%
  Setup memory   x̄1.37MB,   ∧1.35MB,   ∨1.39MB,   ±0.09%
  Run time      x̄12.30ms,   ∧6.90ms,  ∨26.90ms,  ±11.55%
  Run memory     x̄1.05MB,   ∧1.05MB,   ∨1.05MB,   ±0.02%

snabbdom
- todo_app
  Setup time    x̄20.30ms,  ∧18.00ms,  ∨24.40ms,   ±1.34%
  Setup memory   x̄0.81MB,   ∧0.79MB,   ∨0.83MB,   ±0.25%
  Run time       x̄8.50ms,   ∧6.60ms,  ∨11.30ms,   ±1.85%
  Run memory     x̄0.75MB,   ∧0.74MB,   ∨1.11MB,   ±0.92%

staark
- todo_app
  Setup time    x̄15.20ms,  ∧13.20ms,  ∨19.50ms,   ±1.49%
  Setup memory   x̄1.06MB,   ∧1.05MB,   ∨1.09MB,   ±0.15%
  Run time       x̄8.98ms,   ∧7.50ms,  ∨11.30ms,   ±1.89%
  Run memory     x̄0.66MB,   ∧0.61MB,   ∨1.00MB,   ±1.68%

staark-patch
- todo_app
  Setup time    x̄14.18ms,  ∧12.40ms,  ∨21.90ms,   ±1.82%
  Setup memory   x̄0.80MB,   ∧0.76MB,   ∨0.81MB,   ±0.15%
  Run time       x̄7.16ms,   ∧6.20ms,  ∨13.80ms,   ±2.60%
  Run memory     x̄0.52MB,   ∧0.49MB,   ∨1.07MB,   ±2.11%

superfine
- todo_app
  Setup time    x̄15.77ms,  ∧13.00ms,  ∨25.80ms,   ±2.64%
  Setup memory   x̄0.98MB,   ∧0.97MB,   ∨1.02MB,   ±0.29%
  Run time       x̄6.42ms,   ∧5.10ms,  ∨16.40ms,   ±4.66%
  Run memory     x̄0.90MB,   ∧0.86MB,   ∨1.18MB,   ±0.65%
```

> For staark the base build is used which does not include added functions such as `factory` and `nde` Making the comparison with Hyperapp well suited.

> for Snabbdom the added plugins for handling event listeners, class names, and style attributes. This is done to make the comparison to staark-patch and Superfine.

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
