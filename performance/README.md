# Performance

I added tests for several libraries to compare their build size, performance, and memory usage to [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) and [staark-patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme). The build size uses the same build and minification process and should all work on the same browser versions, the same as staark is build for by default. In addition the builds are compressed with brotli before their sizes are shown. Performance and memory usage measurements include the average (x̄), lowest measurement (∧), highest measurement (∨), and margin of error (±).

Memory usage is checked in a rather crude manner. Before each iteration the garbage collector is called then the heap size before and after each test is checked and the difference is seen as the "memory used". The downside is that if the garbage collector is called during the test this affects performance greatly and is not shown properly.

## Benchmarks

Performance is measured in two phases. The setup phase creates the initial app structure. The run phase applies a prepared state change and updates the initial structure. Each phase is verified after timing, so an incorrect or incomplete render fails the benchmark instead of producing a result.

The benchmark replaces `requestAnimationFrame` with a microtask scheduler before loading a library. This retains asynchronous update batching while preventing frame alignment from adding an arbitrary delay to libraries such as Hyperapp. These results therefore measure JavaScript and DOM update work, not browser frame latency.

### reorder

The `reorder` benchmark creates a repeating list of different node types and reverses the type pattern. It measures how each library reconciles unkeyed elements whose types change. It does not measure logical item identity.

### keyed-reorder

The `keyed-reorder` benchmark creates same-type input elements with stable keys and reverses their order. The benchmark verifies DOM node identity for every library.

### todo_app

The `todo_app` benchmark creates `100 * complexity` rows and then replaces the todo collection with an equivalent collection prepared during setup. It measures state application and rendering without including different object-construction loops in the timed phase. The update changes text, classes, styles, and button labels without reordering rows.

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
Minified           3.58KB
Min+gzip           1.74KB    48.72%
Min+brotli         1.56KB    43.66%

staark
Minified           5.02KB
Min+gzip           2.09KB    41.72%
Min+brotli         1.92KB    38.16%

staark-patch
Minified           3.54KB
Min+gzip           1.55KB    43.76%
Min+brotli         1.38KB    38.93%

superfine
Minified           2.34KB
Min+gzip           1.18KB    50.38%
Min+brotli         1.05KB    44.95%
```

### reorder

When ran with a complexity of _100_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
staark-patch
- reorder
  Setup time     x̄3.01ms,   ∧2.70ms,   ∨3.60ms,   ±0.90%
  Setup memory   x̄0.17MB,   ∧0.17MB,   ∨0.17MB,   ±0.00%
  Run time       x̄3.91ms,   ∧3.40ms,   ∨4.70ms,   ±0.90%
  Run memory     x̄0.11MB,   ∧0.11MB,   ∨0.11MB,   ±0.01%

superfine
- reorder
  Setup time     x̄3.01ms,   ∧2.70ms,   ∨3.70ms,   ±1.05%
  Setup memory   x̄0.24MB,   ∧0.24MB,   ∨0.24MB,   ±0.02%
  Run time       x̄3.31ms,   ∧2.00ms,   ∨4.20ms,   ±1.67%
  Run memory     x̄0.23MB,   ∧0.20MB,   ∨0.71MB,   ±4.59%
```

### todo_app

When ran with a complexity of _100_ and _100_ iterations on an Intel i5 MacBook Pro 2020:

```
hyperapp
- todo_app
  Setup time    x̄21.19ms,  ∧15.40ms,  ∨28.40ms,   ±1.93%
  Setup memory   x̄1.03MB,   ∧1.00MB,   ∨1.04MB,   ±0.13%
  Run time       x̄7.20ms,   ∧6.70ms,   ∨8.80ms,   ±0.76%
  Run memory     x̄1.05MB,   ∧1.03MB,   ∨1.06MB,   ±0.18%

staark
- todo_app
  Setup time    x̄17.01ms,  ∧15.90ms,  ∨19.90ms,   ±0.66%
  Setup memory   x̄0.77MB,   ∧0.73MB,   ∨0.81MB,   ±0.39%
  Run time      x̄10.98ms,  ∧10.40ms,  ∨13.50ms,   ±0.75%
  Run memory     x̄0.54MB,   ∧0.50MB,   ∨0.56MB,   ±0.59%

staark-patch
- todo_app
  Setup time    x̄14.50ms,  ∧13.70ms,  ∨16.10ms,   ±0.58%
  Setup memory   x̄0.76MB,   ∧0.75MB,   ∨0.77MB,   ±0.12%
  Run time       x̄8.58ms,   ∧7.90ms,  ∨10.10ms,   ±0.77%
  Run memory     x̄1.06MB,   ∧1.03MB,   ∨1.07MB,   ±0.17%

superfine
- todo_app
  Setup time    x̄13.18ms,  ∧12.20ms,  ∨15.50ms,   ±1.15%
  Setup memory   x̄0.98MB,   ∧0.97MB,   ∨1.02MB,   ±0.10%
  Run time       x̄5.20ms,   ∧4.70ms,   ∨6.10ms,   ±1.12%
  Run memory     x̄0.89MB,   ∧0.89MB,   ∨0.97MB,   ±0.21%
```

> For staark the base build is used which does not include added functions such as `factory` and `nde` Making the comparison with Hyperapp well suited.

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself simply run `yarn run install && yarn run build` followed by either `yarn run benchmark` or `yarn run profile`.
