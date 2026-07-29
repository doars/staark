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

### Superfine

[Superfine](https://github.com/jorgebucaran/superfine#readme) can be seen as [Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) without the state management included. This makes it similar to the relation between [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) and [staark patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme).

## Results

### Sizes

Build size for IIFE builds.

```
hyperapp
Minified           3.76KB
Min+gzip           1.84KB    48.90%
Min+brotli         1.65KB    43.78%

staark
Minified           3.71KB
Min+gzip           1.79KB    48.22%
Min+brotli         1.59KB    42.91%

staark-patch
Minified           2.46KB
Min+gzip           1.24KB    50.52%
Min+brotli         1.08KB    43.85%

superfine
Minified           2.51KB
Min+gzip           1.27KB    50.52%
Min+brotli         1.13KB    45.01%
```

### reorder

When ran with a complexity of _100_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
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

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
