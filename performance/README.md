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
Minified           4.26KB
Min+gzip           2.00KB    47.08%
Min+brotli         1.81KB    42.44%

incremental-dom
Minified           9.40KB
Min+gzip           3.84KB    40.91%
Min+brotli         3.46KB    36.86%

mithril
Minified          25.68KB
Min+gzip           9.61KB    37.44%
Min+brotli         8.60KB    33.48%

snabbdom
Minified          13.48KB
Min+gzip           5.10KB    37.82%
Min+brotli         4.60KB    34.13%

staark
Minified           3.65KB
Min+gzip           1.71KB    46.88%
Min+brotli         1.56KB    42.67%

staark-patch
Minified           2.41KB
Min+gzip           1.15KB    47.81%
Min+brotli         1.02KB    42.54%

superfine
Minified           2.80KB
Min+gzip           1.36KB    48.48%
Min+brotli         1.22KB    43.56%
```

### reorder

When ran with a complexity of _10_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
snabbdom
- reorder
  Setup time     x̄4.38ms,   ∧4.10ms,   ∨5.50ms,   ±0.99%
  Setup memory   x̄0.20MB,   ∧0.20MB,   ∨0.20MB,   ±0.03%
  Run time       x̄2.87ms,   ∧1.80ms,   ∨3.80ms,   ±3.25%
  Run memory     x̄0.33MB,   ∧0.08MB,   ∨1.06MB,  ±14.82%

staark-patch
- reorder
  Setup time     x̄3.40ms,   ∧3.10ms,   ∨4.00ms,   ±1.10%
  Setup memory   x̄0.19MB,   ∧0.19MB,   ∨0.19MB,   ±0.00%
  Run time       x̄3.93ms,   ∧3.00ms,   ∨6.20ms,   ±4.41%
  Run memory     x̄0.13MB,   ∧0.13MB,   ∨0.13MB,   ±0.00%

superfine
- reorder
  Setup time     x̄3.10ms,   ∧2.80ms,   ∨3.50ms,   ±0.75%
  Setup memory   x̄0.25MB,   ∧0.25MB,   ∨0.26MB,   ±0.04%
  Run time       x̄2.30ms,   ∧1.90ms,   ∨3.80ms,   ±4.02%
  Run memory     x̄0.24MB,   ∧0.23MB,   ∨0.71MB,   ±3.81%
```

### todo_app

When ran with a complexity of _10_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
hyperapp
- todo_app
  Setup time    x̄23.02ms,  ∧18.70ms,  ∨31.30ms,   ±2.33%
  Setup memory   x̄1.04MB,   ∧1.02MB,   ∨1.10MB,   ±0.23%
  Run time      x̄14.76ms,  ∧12.70ms,  ∨20.30ms,   ±1.95%
  Run memory     x̄1.76MB,   ∧1.69MB,   ∨1.81MB,   ±0.22%

incremental-dom
- todo_app
  Setup time    x̄20.72ms,  ∧17.20ms,  ∨32.40ms,   ±2.45%
  Setup memory   x̄1.13MB,   ∧1.11MB,   ∨1.59MB,   ±1.10%
  Run time       x̄6.55ms,   ∧5.40ms,  ∨15.50ms,   ±3.66%
  Run memory     x̄0.56MB,   ∧0.06MB,   ∨0.99MB,   ±2.75%

mithril
- todo_app
  Setup time    x̄19.37ms,  ∧18.20ms,  ∨21.50ms,   ±0.57%
  Setup memory   x̄1.65MB,   ∧1.62MB,   ∨1.66MB,   ±0.13%
  Run time      x̄10.00ms,   ∧8.70ms,  ∨17.40ms,   ±2.50%
  Run memory     x̄1.16MB,   ∧1.15MB,   ∨1.18MB,   ±0.13%

snabbdom
- todo_app
  Setup time    x̄18.12ms,  ∧17.00ms,  ∨20.80ms,   ±0.66%
  Setup memory   x̄0.82MB,   ∧0.80MB,   ∨0.85MB,   ±0.24%
  Run time       x̄7.47ms,   ∧6.80ms,   ∨9.90ms,   ±1.22%
  Run memory     x̄0.75MB,   ∧0.75MB,   ∨0.77MB,   ±0.05%

staark
- todo_app
  Setup time    x̄14.13ms,  ∧13.20ms,  ∨15.60ms,   ±0.50%
  Setup memory   x̄1.13MB,   ∧1.11MB,   ∨1.16MB,   ±0.21%
  Run time       x̄8.71ms,   ∧7.60ms,  ∨10.50ms,   ±0.97%
  Run memory     x̄0.73MB,   ∧0.66MB,   ∨0.88MB,   ±0.90%

staark-patch
- todo_app
  Setup time    x̄14.24ms,  ∧13.30ms,  ∨19.90ms,   ±1.01%
  Setup memory   x̄0.76MB,   ∧0.75MB,   ∨0.79MB,   ±0.23%
  Run time       x̄7.58ms,   ∧6.10ms,  ∨10.20ms,   ±1.67%
  Run memory     x̄0.62MB,   ∧0.55MB,   ∨1.08MB,   ±3.43%

superfine
- todo_app
  Setup time    x̄13.13ms,  ∧12.40ms,  ∨14.50ms,   ±0.65%
  Setup memory   x̄0.99MB,   ∧0.98MB,   ∨1.01MB,   ±0.10%
  Run time      x̄10.78ms,   ∧9.80ms,  ∨12.90ms,   ±0.92%
  Run memory     x̄1.17MB,   ∧1.09MB,   ∨1.21MB,   ±0.26%
```

> For staark the base build is used which does not include added functions such as `factory` and `nde` Making the comparison with Hyperapp well suited.

> for Snabbdom the added plugins for handling event listeners, class names, and style attributes. This is done to make the comparison to staark-patch and Superfine.

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
