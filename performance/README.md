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

### RE:DOM

[RE:DOM](https://github.com/redom/redom#readme)

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

redom
Minified           7.72KB
Min+brotli         2.64KB

snabbdom
Minified          13.53KB
Min+brotli         4.61KB

staark
Minified           4.50KB
Min+brotli         1.81KB

staark-patch
Minified           3.10KB
Min+brotli         1.23KB

superfine
Minified           2.84KB
Min+brotli         1.21KB
```

When ran with a complex of _10_ and _16_ iterations on an Intel i5 MacBook Pro 2020.

```
hyperapp
- todo_app
  Setup time    x̄21.22ms,  ∧18.50ms,  ∨24.10ms,   ±4.31%
  Setup memory   x̄1.05MB,   ∧1.02MB,   ∨1.06MB,   ±0.64%
  Run time      x̄14.33ms,  ∧12.70ms,  ∨18.10ms,   ±5.12%
  Run memory     x̄1.75MB,   ∧1.72MB,   ∨1.81MB,   ±0.56%

mithril
- todo_app
  Setup time    x̄19.64ms,  ∧18.30ms,  ∨20.30ms,   ±1.24%
  Setup memory   x̄1.65MB,   ∧1.63MB,   ∨1.65MB,   ±0.20%
  Run time      x̄10.10ms,   ∧9.10ms,  ∨12.40ms,   ±5.22%
  Run memory     x̄1.16MB,   ∧1.15MB,   ∨1.18MB,   ±0.29%

redom
- todo_app
  Setup time    x̄20.28ms,  ∧19.80ms,  ∨21.90ms,   ±1.22%
  Setup memory   x̄1.30MB,   ∧1.24MB,   ∨1.94MB,   ±6.28%
  Run time       x̄9.46ms,   ∧9.20ms,  ∨10.00ms,   ±1.04%
  Run memory     x̄0.24MB,   ∧0.23MB,   ∨0.24MB,   ±0.47%

snabbdom
- todo_app
  Setup time    x̄17.45ms,  ∧16.70ms,  ∨21.90ms,   ±3.35%
  Setup memory   x̄0.82MB,   ∧0.80MB,   ∨0.84MB,   ±0.59%
  Run time       x̄7.80ms,   ∧7.10ms,   ∨9.10ms,   ±4.18%
  Run memory     x̄0.75MB,   ∧0.75MB,   ∨0.76MB,   ±0.10%

staark
- todo_app
  Setup time    x̄22.79ms,  ∧22.00ms,  ∨23.70ms,   ±0.81%
  Setup memory   x̄1.86MB,   ∧1.85MB,   ∨1.90MB,   ±0.35%
  Run time      x̄11.18ms,  ∧10.40ms,  ∨12.20ms,   ±2.27%
  Run memory     x̄1.14MB,   ∧1.10MB,   ∨1.23MB,   ±2.13%

staark-patch
- todo_app
  Setup time    x̄13.07ms,  ∧12.70ms,  ∨13.60ms,   ±0.89%
  Setup memory   x̄0.75MB,   ∧0.75MB,   ∨0.76MB,   ±0.26%
  Run time       x̄9.28ms,   ∧8.60ms,  ∨10.10ms,   ±2.07%
  Run memory     x̄0.92MB,   ∧0.90MB,   ∨0.93MB,   ±0.23%

superfine
- todo_app
  Setup time    x̄12.27ms,  ∧11.70ms,  ∨13.30ms,   ±1.39%
  Setup memory   x̄0.98MB,   ∧0.98MB,   ∨1.00MB,   ±0.18%
  Run time      x̄11.08ms,  ∧10.30ms,  ∨12.20ms,   ±2.48%
  Run memory     x̄1.20MB,   ∧1.18MB,   ∨1.21MB,   ±0.33%
```

When ran with a complex of _100_ and _16_ iterations on an Intel i5 MacBook Pro 2020.

```
hyperapp
- todo_app
  Setup time   x̄124.24ms, ∧117.80ms, ∨149.80ms,   ±3.07%
  Setup memory  x̄11.27MB,   ∧8.44MB,  ∨11.54MB,   ±3.18%
  Run time      x̄96.98ms,  ∧93.80ms, ∨101.40ms,   ±1.01%
  Run memory     x̄8.04MB,   ∧7.82MB,   ∨8.43MB,   ±1.36%

mithril
- todo_app
  Setup time   x̄122.88ms, ∧120.90ms, ∨127.70ms,   ±0.62%
  Setup memory  x̄13.67MB,  ∧13.61MB,  ∨13.82MB,   ±0.19%
  Run time      x̄53.87ms,  ∧52.10ms,  ∨56.20ms,   ±1.05%
  Run memory    x̄10.86MB,  ∧10.82MB,  ∨10.90MB,   ±0.10%

redom
- todo_app
  Setup time   x̄133.46ms, ∧131.30ms, ∨137.40ms,   ±0.58%
  Setup memory   x̄6.29MB,   ∧6.24MB,   ∨6.35MB,   ±0.25%
  Run time      x̄79.28ms,  ∧78.10ms,  ∨80.70ms,   ±0.46%
  Run memory     x̄0.72MB,   ∧0.69MB,   ∨0.74MB,   ±1.05%

snabbdom
- todo_app
  Setup time   x̄124.84ms, ∧122.40ms, ∨130.40ms,   ±0.97%
  Setup memory   x̄6.76MB,   ∧6.73MB,   ∨6.82MB,   ±0.17%
  Run time      x̄58.30ms,  ∧56.50ms,  ∨60.40ms,   ±0.91%
  Run memory     x̄5.26MB,   ∧5.24MB,   ∨5.29MB,   ±0.11%

staark
- todo_app
  Setup time   x̄181.18ms, ∧178.50ms, ∨188.40ms,   ±0.66%
  Setup memory  x̄12.02MB,  ∧11.89MB,  ∨12.31MB,   ±0.56%
  Run time     x̄116.13ms, ∧110.80ms, ∨122.50ms,   ±1.67%
  Run memory     x̄7.80MB,   ∧7.24MB,   ∨8.64MB,   ±3.83%

staark-patch
- todo_app
  Setup time    x̄97.50ms,  ∧95.80ms, ∨100.00ms,   ±0.60%
  Setup memory   x̄5.11MB,   ∧5.06MB,   ∨5.17MB,   ±0.33%
  Run time      x̄84.53ms,  ∧82.50ms,  ∨86.70ms,   ±0.71%
  Run memory     x̄7.11MB,   ∧7.05MB,   ∨7.36MB,   ±0.49%

superfine
- todo_app
  Setup time   x̄111.78ms, ∧104.90ms, ∨149.50ms,   ±5.03%
  Setup memory   x̄7.01MB,   ∧6.97MB,   ∨7.05MB,   ±0.13%
  Run time      x̄79.29ms,  ∧75.50ms,  ∨96.30ms,   ±2.89%
  Run memory     x̄9.37MB,   ∧9.31MB,   ∨9.43MB,   ±0.18%
```

> For staark the base build is used which does not include added functions such as `factory` and `nde` Making the comparison with Hyperapp well suited.

> for Snabbdom the added plugins for handling event listeners, class names, and style attributes. This is done to make the comparison to staark-patch and Superfine.

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
