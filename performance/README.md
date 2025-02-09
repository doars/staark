# Performance

I added tests for several libraries to compare their build size, performance, and memory usage to [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) and [staark-patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme). The build size uses the same build and minification process and should all work on the same browser versions, the same as staark is build for by default. In addition the builds are compressed with brotli before their sizes are shown. Performance and memory usage measurements include the average (x̄), lowest measurement (∧), highest measurement (∨), and margin of error (±).

Memory usage is checked in a rather crude manner. Before each iteration the garbage collector is called then the heap size before and after each test is checked and the difference is seen as the "memory used". The downside is that if the garbage collector is called during the test this affects performance greatly and is not shown properly.

## Benchmarks

The performance is measured in two phases. The first is the setup process this is where the library creates the initial app structure. After which the second phase is ran, this phase modifies the state and runs the library to modify the initial app structure into the new desired structure.

### todo_app

Currently only one benchmark is included called `todo_app` where a thousand rows are created and then modified in the for of an app to keep track of tasks. Simple enough to test how well the app handles adding nodes, modifying texts, and changing attributes over a list of data.

## Libraries

### Hyperapp

[Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) is a similar library to [staark](https://github.com/doars/staark/tree/main/packages/staark#readme). It offers almost the same functionality with some exceptions. Out of the box it does not have the `factory`, `fctory`, and `nde` function, although these could be added as wrappers. Hyperapp also doesn't handle `class` and `style` attributes the same way, but the biggest difference is in how you as the user make changes to the state. Hyperapp expects you to return a new copy of the state with the mutations made as the return of a listener. This means only listeners can easily mutate the state at the end of the event. staark on the other had allows mutation of any key on the state no matter when, it will then after a change has been made re-render the application. This means staark allows you to comfortably use asynchronous functions such [fetch](https://github.com/doars/staark/tree/main/packages/vroagn#readme) and have it automatically update the interface afterwards. And an added bonus of staark is that if an event does not change the state then no re-rendering will happen.

### Mithril

[Mithril](https://github.com/MithrilJS/mithril.js#readme)

### Snabbdom

[Snabbdom](https://github.com/snabbdom/snabbdom#readme) is similar library to [staark patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme) and has many overlapping features. Snabbdom comes with many more, mainly focussed at being the base for your own framework to be build on top, whereas staark patch is only concerned with you brining your own state, since [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) already exists providing a full solution.

### Superfine

[Superfine](https://github.com/jorgebucaran/superfine#readme) can be seen as [Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) without the state management included. This makes it similar to the relation between [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) and [staark patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme).

## Results

```
hyperapp
Minified           4.30KB
Min+brotli         1.80KB

mithril
Minified          26.02KB
Min+brotli         8.67KB

snabbdom
Minified          13.53KB
Min+brotli         4.61KB

staark
Minified           4.22KB
Min+brotli         1.72KB

staark-patch
Minified           2.78KB
Min+brotli         1.13KB

superfine
Minified           2.84KB
Min+brotli         1.21KB
```

When ran with a complexity of _10_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
hyperapp
- todo_app
  Setup time    x̄23.02ms,  ∧18.70ms,  ∨31.30ms,   ±2.33%
  Setup memory   x̄1.04MB,   ∧1.02MB,   ∨1.10MB,   ±0.23%
  Run time      x̄14.76ms,  ∧12.70ms,  ∨20.30ms,   ±1.95%
  Run memory     x̄1.76MB,   ∧1.69MB,   ∨1.81MB,   ±0.22%

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
  Run time      x̄10.51ms,   ∧9.70ms,  ∨13.00ms,   ±0.99%
  Run memory     x̄1.03MB,   ∧1.00MB,   ∨1.36MB,   ±1.56%

staark-patch
- todo_app
  Setup time    x̄14.24ms,  ∧13.30ms,  ∨19.90ms,   ±1.01%
  Setup memory   x̄0.76MB,   ∧0.75MB,   ∨0.79MB,   ±0.23%
  Run time       x̄9.10ms,   ∧8.30ms,  ∨10.60ms,   ±1.10%
  Run memory     x̄0.94MB,   ∧0.84MB,   ∨1.43MB,   ±2.30%

superfine
- todo_app
  Setup time    x̄13.13ms,  ∧12.40ms,  ∨14.50ms,   ±0.65%
  Setup memory   x̄0.99MB,   ∧0.98MB,   ∨1.01MB,   ±0.10%
  Run time      x̄10.78ms,   ∧9.80ms,  ∨12.90ms,   ±0.92%
  Run memory     x̄1.17MB,   ∧1.09MB,   ∨1.21MB,   ±0.26%
```

When ran with a complexity of _100_ and _10_ iterations on an Intel i5 MacBook Pro 2020:

```
hyperapp
- todo_app
  Setup time   x̄126.38ms, ∧121.30ms, ∨134.00ms,   ±1.94%
  Setup memory  x̄11.30MB,  ∧11.24MB,  ∨11.39MB,   ±0.26%
  Run time      x̄96.00ms,  ∧93.20ms, ∨102.80ms,   ±2.02%
  Run memory     x̄8.48MB,   ∧8.28MB,   ∨8.61MB,   ±0.66%

mithril
- todo_app
  Setup time   x̄122.40ms, ∧119.60ms, ∨129.10ms,   ±1.32%
  Setup memory  x̄13.73MB,  ∧13.70MB,  ∨13.79MB,   ±0.11%
  Run time      x̄54.19ms,  ∧52.50ms,  ∨57.70ms,   ±1.79%
  Run memory    x̄10.75MB,  ∧10.37MB,  ∨10.84MB,   ±0.74%

snabbdom
- todo_app
  Setup time   x̄125.31ms, ∧124.20ms, ∨127.50ms,   ±0.49%
  Setup memory   x̄6.75MB,   ∧6.74MB,   ∨6.79MB,   ±0.13%
  Run time      x̄58.84ms,  ∧56.80ms,  ∨61.00ms,   ±1.12%
  Run memory     x̄5.25MB,   ∧5.24MB,   ∨5.28MB,   ±0.15%

staark
- todo_app
  Setup time   x̄111.38ms, ∧108.90ms, ∨114.90ms,   ±1.00%
  Setup memory   x̄9.47MB,   ∧9.42MB,   ∨9.51MB,   ±0.18%
  Run time     x̄100.75ms,  ∧98.80ms, ∨103.80ms,   ±1.01%
  Run memory     x̄7.48MB,   ∧7.41MB,   ∨7.55MB,   ±0.37%

staark-patch
- todo_app
  Setup time   x̄104.30ms, ∧100.70ms, ∨107.30ms,   ±0.95%
  Setup memory   x̄5.14MB,   ∧5.11MB,   ∨5.19MB,   ±0.33%
  Run time      x̄89.37ms,  ∧88.20ms,  ∨91.30ms,   ±0.58%
  Run memory     x̄7.06MB,   ∧7.02MB,   ∨7.12MB,   ±0.23%

superfine
- todo_app
  Setup time   x̄118.94ms, ∧116.80ms, ∨121.50ms,   ±0.75%
  Setup memory   x̄7.01MB,   ∧7.00MB,   ∨7.03MB,   ±0.08%
  Run time      x̄79.79ms,  ∧75.20ms,  ∨85.20ms,   ±2.10%
  Run memory     x̄9.37MB,   ∧9.30MB,   ∨9.42MB,   ±0.24%
```

> For staark the base build is used which does not include added functions such as `factory` and `nde` Making the comparison with Hyperapp well suited.

> for Snabbdom the added plugins for handling event listeners, class names, and style attributes. This is done to make the comparison to staark-patch and Superfine.

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
