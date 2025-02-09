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
  Run time      x̄15.99ms,  ∧13.00ms,  ∨30.50ms,   ±2.59%
  Run memory     x̄1.77MB,   ∧1.68MB,   ∨1.87MB,   ±0.32%

mithril
- todo_app
  Setup time    x̄19.37ms,  ∧18.20ms,  ∨21.50ms,   ±0.57%
  Setup memory   x̄1.65MB,   ∧1.62MB,   ∨1.66MB,   ±0.13%
  Run time      x̄10.00ms,   ∧8.70ms,  ∨17.40ms,   ±2.50%
  Run memory     x̄1.16MB,   ∧1.15MB,   ∨1.18MB,   ±0.13%

snabbdom
- todo_app
  Setup time    x̄18.57ms,  ∧16.00ms,  ∨26.90ms,   ±2.17%
  Setup memory   x̄0.82MB,   ∧0.80MB,   ∨0.84MB,   ±0.20%
  Run time       x̄8.17ms,   ∧6.80ms,  ∨10.80ms,   ±2.14%
  Run memory     x̄0.75MB,   ∧0.75MB,   ∨0.77MB,   ±0.06%

staark
- todo_app
  Setup time    x̄15.06ms,  ∧13.50ms,  ∨18.80ms,   ±1.33%
  Setup memory   x̄1.13MB,   ∧1.11MB,   ∨1.16MB,   ±0.20%
  Run time      x̄11.97ms,  ∧10.00ms,  ∨15.80ms,   ±1.82%
  Run memory     x̄1.06MB,   ∧0.98MB,   ∨1.43MB,   ±1.30%

staark-patch
- todo_app
  Setup time    x̄15.19ms,  ∧13.60ms,  ∨18.10ms,   ±1.29%
  Setup memory   x̄0.76MB,   ∧0.75MB,   ∨0.79MB,   ±0.22%
  Run time      x̄10.44ms,   ∧8.30ms,  ∨13.30ms,   ±1.76%
  Run memory     x̄0.91MB,   ∧0.82MB,   ∨1.43MB,   ±1.25%

superfine
- todo_app
  Setup time    x̄14.04ms,  ∧12.30ms,  ∨17.20ms,   ±1.17%
  Setup memory   x̄0.99MB,   ∧0.98MB,   ∨1.02MB,   ±0.16%
  Run time      x̄12.60ms,  ∧10.80ms,  ∨15.40ms,   ±1.48%
  Run memory     x̄1.21MB,   ∧1.15MB,   ∨1.26MB,   ±0.30%
```

When ran with a complexity of _100_ and _10_ iterations on an Intel i5 MacBook Pro 2020:

```
hyperapp
- todo_app
  Setup time   x̄139.25ms, ∧130.10ms, ∨171.90ms,   ±5.22%
  Setup memory  x̄11.16MB,   ∧8.08MB,  ∨11.64MB,   ±5.71%
  Run time     x̄111.36ms, ∧101.40ms, ∨130.10ms,   ±4.29%
  Run memory     x̄7.51MB,   ∧6.24MB,   ∨8.52MB,   ±6.65%

mithril
- todo_app
  Setup time   x̄138.54ms, ∧131.40ms, ∨151.30ms,   ±3.32%
  Setup memory  x̄13.69MB,  ∧13.60MB,  ∨13.78MB,   ±0.25%
  Run time      x̄58.42ms,  ∧56.80ms,  ∨63.60ms,   ±2.02%
  Run memory    x̄10.79MB,  ∧10.56MB,  ∨10.86MB,   ±0.47%

snabbdom
- todo_app
  Setup time   x̄138.01ms, ∧122.20ms, ∨181.30ms,   ±7.44%
  Setup memory   x̄6.77MB,   ∧6.72MB,   ∨6.81MB,   ±0.20%
  Run time      x̄62.38ms,  ∧57.20ms,  ∨74.00ms,   ±5.49%
  Run memory     x̄5.21MB,   ∧4.65MB,   ∨5.30MB,   ±2.20%

staark
- todo_app
  Setup time   x̄111.38ms, ∧108.90ms, ∨114.90ms,   ±1.00%
  Setup memory   x̄9.47MB,   ∧9.42MB,   ∨9.51MB,   ±0.18%
  Run time     x̄113.22ms, ∧110.00ms, ∨123.10ms,   ±2.02%
  Run memory     x̄8.54MB,   ∧8.28MB,   ∨8.65MB,   ±0.74%

staark-patch
- todo_app
  Setup time   x̄109.33ms, ∧106.70ms, ∨114.80ms,   ±1.44%
  Setup memory   x̄5.14MB,   ∧5.11MB,   ∨5.17MB,   ±0.23%
  Run time      x̄92.45ms,  ∧90.50ms,  ∨94.00ms,   ±0.62%
  Run memory     x̄7.04MB,   ∧7.01MB,   ∨7.09MB,   ±0.18%

superfine
- todo_app
  Setup time   x̄118.94ms, ∧116.80ms, ∨121.50ms,   ±0.75%
  Setup memory   x̄7.01MB,   ∧7.00MB,   ∨7.03MB,   ±0.08%
  Run time      x̄87.49ms,  ∧83.60ms,  ∨95.90ms,   ±2.79%
  Run memory     x̄9.37MB,   ∧9.29MB,   ∨9.43MB,   ±0.26%
```

> For staark the base build is used which does not include added functions such as `factory` and `nde` Making the comparison with Hyperapp well suited.

> for Snabbdom the added plugins for handling event listeners, class names, and style attributes. This is done to make the comparison to staark-patch and Superfine.

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
