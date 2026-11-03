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

### update-one, prepend, and remove-one

These benchmarks create a keyed list of `100 * complexity` rows, each with a label and a button. The run phase then makes a single small change: `update-one` changes the label of the middle row, `prepend` inserts a row at the start, and `remove-one` removes the middle row. They measure the overhead of re-rendering a large view for a small change, which is the most common kind of update in an app. Each library changes its state the way it is meant to be used, so staark mutates its state proxy and Hyperapp returns a new state. The benchmarks verify the rows and that every remaining row keeps its DOM element.

### update-one-memo

The same as `update-one`, but every row is rendered through `memo` so unchanged rows can be skipped. Only libraries with memoization are included.

### Warm runs

Every iteration loads a fresh page, so by default the measurements include running code that the JavaScript engine has not optimised yet. Pass `--warmup=10`, or use `npm run benchmark:warm`, to run the whole benchmark ten times on the page before measuring it.

## Libraries

### Hyperapp

[Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) is a similar library to [staark](https://github.com/doars/staark/tree/main/packages/staark#readme). It offers almost the same functionality with some exceptions. Out of the box it does not have the `factory`, `fctory`, and `nde` function, although these could be added as wrappers. Hyperapp also doesn't handle `class` and `style` attributes the same way, but the biggest difference is in how you as the user make changes to the state. Hyperapp expects you to return a new copy of the state with the mutations made as the return of a listener. This means only listeners can easily mutate the state at the end of the event. staark on the other had allows mutation of any key on the state no matter when, it will then after a change has been made re-render the application. This means staark allows you to comfortably use asynchronous functions such [fetch](https://github.com/doars/staark/tree/main/packages/vroagn#readme) and have it automatically update the interface afterwards. And an added bonus of staark is that if an event does not change the state then no re-rendering will happen.

### Superfine

[Superfine](https://github.com/jorgebucaran/superfine#readme) can be seen as [Hyperapp](https://github.com/jorgebucaran/hyperapp#readme) without the state management included. This makes it similar to the relation between [staark](https://github.com/doars/staark/tree/main/packages/staark#readme) and [staark patch](https://github.com/doars/staark/tree/main/packages/staark-patch#readme).

## Results

Measured on a Mac mini with an Apple M6 and 32 GB of memory, using Node.js 26.13 and Playwright 1.64 with Chromium. The benchmarks were run with a complexity of _100_, so lists have 10,000 rows, and _100_ iterations.

> For staark the base build is used which does not include added functions such as `factory` and `nde`, making the comparison with Hyperapp well suited.

### Sizes

Build size for IIFE builds.

```
hyperapp
Minified           3.57KB
Min+gzip           1.74KB    48.78%
Min+brotli         1.56KB    43.82%

staark
Minified           5.77KB
Min+gzip           2.59KB    44.97%
Min+brotli         2.39KB    41.43%

staark-patch
Minified           3.26KB
Min+gzip           1.59KB    48.94%
Min+brotli         1.45KB    44.56%

superfine
Minified           2.33KB
Min+gzip           1.17KB    50.40%
Min+brotli         1.05KB    44.95%
```

### Times

Average time in milliseconds, the fastest library per row is in bold. Memory usage is left out for brevity, run the benchmarks to see it.

Cold, every iteration loads a fresh page:

| Benchmark | Phase | staark | staark-patch | superfine | hyperapp |
|---|---|---:|---:|---:|---:|
| todo_app | setup | 29.49 | **22.51** | 25.89 | 24.50 |
| todo_app | run | 10.71 | **8.40** | 11.19 | 11.89 |
| update-one | setup | 19.97 | **15.56** | 18.84 | 18.72 |
| update-one | run | 4.04 | **3.10** | 3.81 | 5.24 |
| update-one-memo | setup | 22.38 | – | – | **18.51** |
| update-one-memo | run | 2.81 | – | – | **1.48** |
| prepend | setup | 19.88 | **15.93** | 19.26 | 19.55 |
| prepend | run | 6.31 | **3.08** | 3.67 | 5.18 |
| remove-one | setup | 20.11 | **15.79** | 18.92 | 18.53 |
| remove-one | run | 5.06 | **2.96** | 3.59 | 4.91 |
| reorder | setup | 3.51 | **2.92** | 3.49 | 3.98 |
| reorder | run | 4.18 | **3.91** | 5.55 | 5.81 |
| keyed-reorder | setup | 5.81 | **5.70** | 8.19 | 7.84 |
| keyed-reorder | run | 7.22 | **7.15** | 11.86 | 12.07 |

Warm, with `--warmup=10`:

| Benchmark | Phase | staark | staark-patch | superfine | hyperapp |
|---|---|---:|---:|---:|---:|
| todo_app | setup | 28.88 | **21.18** | 29.08 | 27.28 |
| todo_app | run | 9.04 | **7.47** | 11.40 | 11.92 |
| update-one | setup | 18.31 | **13.12** | 17.08 | 17.90 |
| update-one | run | 3.57 | **2.67** | 2.84 | 4.15 |
| update-one-memo | setup | 20.32 | – | – | **17.90** |
| update-one-memo | run | 2.40 | – | – | **1.26** |
| prepend | setup | 19.06 | **13.07** | 17.20 | 17.25 |
| prepend | run | 5.82 | **2.52** | 2.86 | 4.13 |
| remove-one | setup | 18.84 | **13.08** | 17.20 | 17.07 |
| remove-one | run | 4.70 | **2.53** | 2.86 | 4.06 |
| reorder | setup | 2.87 | **2.41** | 2.82 | 3.08 |
| reorder | run | **2.73** | 2.76 | 3.40 | 4.86 |
| keyed-reorder | setup | 5.15 | **4.66** | 6.80 | 7.03 |
| keyed-reorder | run | **5.71** | 5.80 | 10.76 | 11.34 |

## Profiling

The performance measurements also include outputting profiling information. This can be useful when learning more about the internals of the library and figure out where most time is spend. The generated profile data takes the form of a flame graphs which can be opened with several tools for example [speedscope.app](https://speedscope.app).

## Usage

To run the benchmark and profile the libraries yourself, run `npm install` in the repository root and `npx playwright install chromium`, then `npm run build` in this directory followed by `npm run benchmark`, `npm run benchmark:warm`, or `npm run profile`. Add `-- --complexity=100` to measure with the same list sizes as the results above.
