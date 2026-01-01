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
Minified           3.86KB
Min+gzip           1.85KB    47.81%
Min+brotli         1.64KB    42.58%

staark-patch
Minified           2.61KB
Min+gzip           1.30KB    49.70%
Min+brotli         1.13KB    43.31%

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
  Setup time     x̄4.51ms,   ∧4.10ms,   ∨5.40ms,   ±1.18%
  Setup memory   x̄0.20MB,   ∧0.19MB,   ∨1.20MB,  ±10.73%
  Run time       x̄2.68ms,   ∧1.90ms,   ∨3.50ms,   ±3.31%
  Run memory     x̄0.32MB,   ∧0.10MB,   ∨0.81MB,  ±13.86%

staark-patch
- reorder
  Setup time     x̄3.22ms,   ∧3.00ms,   ∨3.70ms,   ±0.94%
  Setup memory   x̄0.16MB,   ∧0.16MB,   ∨0.16MB,   ±0.00%
  Run time       x̄3.85ms,   ∧3.50ms,   ∨4.50ms,   ±1.03%
  Run memory     x̄0.11MB,   ∧0.10MB,   ∨0.11MB,   ±0.26%

superfine
- reorder
  Setup time     x̄3.12ms,   ∧2.70ms,   ∨3.50ms,   ±1.05%
  Setup memory   x̄0.24MB,   ∧0.24MB,   ∨0.24MB,   ±0.02%
  Run time       x̄3.06ms,   ∧2.10ms,   ∨6.30ms,   ±3.74%
  Run memory     x̄0.23MB,   ∧0.20MB,   ∨0.76MB,   ±4.60%
```

### todo_app

When ran with a complexity of _100_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
hyperapp
- todo_app
  Setup time    x̄23.98ms,  ∧14.50ms,  ∨36.70ms,   ±4.46%
  Setup memory   x̄0.99MB,   ∧0.97MB,   ∨1.00MB,   ±0.09%
  Run time       x̄8.07ms,   ∧7.10ms,  ∨24.10ms,   ±5.61%
  Run memory     x̄1.02MB,   ∧1.01MB,   ∨1.04MB,   ±0.17%

incremental-dom
- todo_app
  Setup time    x̄20.96ms,  ∧18.80ms,  ∨29.20ms,   ±1.80%
  Setup memory   x̄1.04MB,   ∧1.03MB,   ∨1.07MB,   ±0.16%
  Run time       x̄5.37ms,   ∧4.60ms,   ∨9.50ms,   ±2.27%
  Run memory     x̄0.54MB,   ∧0.52MB,   ∨0.57MB,   ±0.21%

mithril
- todo_app
  Setup time    x̄19.46ms,  ∧17.70ms,  ∨21.80ms,   ±0.98%
  Setup memory   x̄1.37MB,   ∧1.35MB,   ∨1.38MB,   ±0.08%
  Run time       x̄8.81ms,   ∧6.70ms,  ∨28.00ms,  ±10.56%
  Run memory     x̄1.05MB,   ∧1.05MB,   ∨1.05MB,   ±0.01%

snabbdom
- todo_app
  Setup time    x̄18.84ms,  ∧17.00ms,  ∨21.50ms,   ±0.89%
  Setup memory   x̄0.81MB,   ∧0.79MB,   ∨0.83MB,   ±0.23%
  Run time       x̄7.87ms,   ∧6.90ms,   ∨9.10ms,   ±1.04%
  Run memory     x̄0.76MB,   ∧0.75MB,   ∨1.11MB,   ±1.11%

staark
- todo_app
  Setup time    x̄14.54ms,  ∧13.50ms,  ∨16.60ms,   ±0.86%
  Setup memory   x̄1.05MB,   ∧1.05MB,   ∨1.06MB,   ±0.04%
  Run time       x̄8.36ms,   ∧7.50ms,  ∨10.00ms,   ±1.13%
  Run memory     x̄0.66MB,   ∧0.64MB,   ∨0.80MB,   ±1.06%

staark-patch
- todo_app
  Setup time    x̄13.10ms,  ∧12.30ms,  ∨14.60ms,   ±0.78%
  Setup memory   x̄0.80MB,   ∧0.79MB,   ∨0.81MB,   ±0.09%
  Run time       x̄6.53ms,   ∧5.90ms,   ∨7.30ms,   ±0.93%
  Run memory     x̄0.51MB,   ∧0.50MB,   ∨0.52MB,   ±0.12%

superfine
- todo_app
  Setup time    x̄13.69ms,  ∧12.80ms,  ∨15.90ms,   ±0.85%
  Setup memory   x̄0.97MB,   ∧0.97MB,   ∨1.00MB,   ±0.09%
  Run time       x̄5.53ms,   ∧5.10ms,   ∨7.20ms,   ±1.21%
  Run memory     x̄0.89MB,   ∧0.88MB,   ∨0.91MB,   ±0.11%
```

> For staark the base build is used which does not include added functions such as `factory` and `nde` Making the comparison with Hyperapp well suited.

> for Snabbdom the added plugins for handling event listeners, class names, and style attributes. This is done to make the comparison to staark-patch and Superfine.

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
