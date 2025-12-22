import { sync as brotliSizeSync } from 'brotli-size'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { chromium } from 'playwright'
import {
    fileURLToPath,
} from 'url'
import {
    promisify,
} from 'util'
import {
    gzip,
} from 'zlib'

const gzipAsync = promisify(gzip)

const ARGUMENT_BENCHMARK = '--benchmark='
const ARGUMENT_LIBRARY = '--library='
const ARGUMENT_ITERATIONS = '--iterations='
const ARGUMENT_COMPLEXITY = '--complexity='

const DIRECTORY_BENCHMARK = 'benchmarks'
const DIRECTORY_LIBRARY = 'dst'
const DIRECTORY_PROFILE = 'profiles'

const fmtLabel =
  (value, prefix = '') => (prefix + value).padEnd(14, ' ') + ' '
const fmtKB =
  (bytes, prefix = '') => (prefix + (bytes / 1024).toFixed(2)).padStart(8, ' ') + 'KB'
const fmtMB =
  (bytes, prefix = '') => (prefix + (bytes / 1024 / 1024).toFixed(2)).padStart(8, ' ') + 'MB'
const fmtMs =
  (time, prefix = '') => (prefix + time.toFixed(2)).padStart(8, ' ') + 'ms'
const fmtPercent =
  (value, prefix = '') => (prefix + value.toFixed(2)).padStart(8, ' ') + '%'

const fileDirectory = path.dirname(
  fileURLToPath(import.meta.url),
)
const projectDirectory = path.join(fileDirectory, '..')

const options = {
  benchmark: null,
  library: null,
  sizes: false,

  minified: false,
  profile: false,

  complexity: 10,
  iterations: 100,
}
const args = process.argv.slice(2)
args.forEach(arg => {
  if (arg.startsWith(ARGUMENT_LIBRARY)) {
    // Split at the first '=' and take the second part as the value.
    options.library = arg.substring(ARGUMENT_LIBRARY.length)
  } else if (arg.startsWith(ARGUMENT_BENCHMARK)) {
    options.benchmark = arg.substring(ARGUMENT_BENCHMARK.length)
  } else if (arg.startsWith(ARGUMENT_COMPLEXITY)) {
    options.complexity = Number.parseInt(
      arg.substring(ARGUMENT_COMPLEXITY.length),
    )
  } else if (arg.startsWith(ARGUMENT_ITERATIONS)) {
    options.iterations = Number.parseInt(
      arg.substring(ARGUMENT_ITERATIONS.length),
    )
  } else if (arg === '--profile') {
    // Set the flag to true if the argument is exactly the flag.
    options.profile = true
  } else if (arg === '--minified') {
    options.minified = true
  } else if (arg === '--sizes') {
    options.sizes = true
  }
})
console.log('Running with options', options)

const calculateStats = (
  items,
) => {
  const average = items.reduce(
    (a, b) => a + b,
    0,
  ) / items.length
  const variance = items.reduce(
    (sum, value) => sum + Math.pow(value - average, 2),
    0,
  ) / items.length
  const standardError = Math.sqrt(variance) / Math.sqrt(items.length)
  const marginOfError = (1.96 * standardError / average) * 100
  return {
    average: average,
    deviation: Math.sqrt(variance),
    max: Math.max(...items),
    min: Math.min(...items),
    marginOfError: marginOfError,
  }
}

async function runBenchmark (
  browser,
  helpersCode,
  libraryCode,
  benchmarkCode,
  profilePath,
) {
  const page = await browser.newPage()

  const client = await page.context().newCDPSession(page)
  await client.send('HeapProfiler.enable');

  await page.addScriptTag({
    content: (libraryCode ? libraryCode : ''),
  })
  await page.addScriptTag({
    // '(function(){' + helpersCode + '}())'
    content: '(function(){' + benchmarkCode + '}())',
  })

  page.on('console', (message) => {
    console.warn(
      message.text(),
    )
  })

  await page.evaluate(() => {
    const rootNode = document.createElement('div')
    document.body.appendChild(rootNode)
  })

  const context = await page.evaluateHandle((options) => ({
    complexity: options.complexity,
    rootNode: document.querySelector('div'),
    window: window,
  }), options)

  const callBenchmark = async (
    functionName,
  ) => {
    const traceFilePath = (
      profilePath
        ? profilePath + '-' + functionName + '.json'
        : null
    )
    if (traceFilePath) {
      const directoryPath = path.dirname(profilePath)
      if (directoryPath) {
        if (!fs.existsSync(directoryPath)) {
          fs.mkdirSync(directoryPath, {
            recursive: true,
          })
        }
      }
      if (fs.existsSync(traceFilePath)) {
        fs.unlinkSync(traceFilePath)
      }
    }

    await client.send('HeapProfiler.collectGarbage')

    let tracingPromise
    if (traceFilePath) {
      let traceData = []
      let tracingCompleteResolve
      tracingPromise = new Promise(resolve => {
        tracingCompleteResolve = resolve
      })
      client.on('Tracing.dataCollected', (params) => {
        traceData.push(...params.value)
      })
      client.on('Tracing.tracingComplete', () => {
        const trace = '{"traceEvents": [' + traceData.map(event => JSON.stringify(event)).join(',') + ']}'
        fs.writeFileSync(traceFilePath, trace)
        tracingCompleteResolve()
      })
      await client.send('Tracing.start', {
        categories: [
          '-*',
          'blink',
          'devtools.timeline',
          'disabled-by-default-devtools.timeline',
          'v8',
          'disabled-by-default-v8.cpu_profiler',
        ].join(','),
      })
    }

    const runner = async ({ context, functionName }) => {
      const startMemory = performance.memory?.usedJSHeapSize || 0
      const startTime = performance.now()

      try {
        if (context.window.benchmark[functionName]) {
          await context.window.benchmark[functionName](context)
        }
      } catch (error) {
        console.warn('Benchmark failed because of ' + error.name + ': ' + error.message)
      }

      return {
        time: performance.now() - startTime,
        memory: (performance.memory?.usedJSHeapSize || 0) - startMemory,
      }
    }
    const result = await page.evaluate(runner, { context, functionName })

    if (traceFilePath) {
      await client.send('Tracing.end')
      await tracingPromise
    }

    return result
  }

  const setupResults = await callBenchmark('setup')
  const runResults = await callBenchmark('run')

  const runner = async ({ context }) => {
    if (context.window.benchmark.cleanup) {
      context.window.benchmark.cleanup(context)
    }
  }
  await page.evaluate(runner, { context })

  await client.detach()
  await page.close()

  return {
    setup: setupResults,
    run: runResults,
  }
}

async function runBenchmarks () {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--enable-benchmarking',
      '--enable-precise-memory-info',
      '--js-flags=--expose-gc',
      '--no-cpu-throttling',
    ],
  })

  const helpersCode = await fsPromises.readFile(
    path.join(projectDirectory, 'src', 'helpers.js'),
  )

  const libraries = await fsPromises.readdir(
    path.join(projectDirectory, DIRECTORY_BENCHMARK),
  )

  for (const libraryName of libraries) {
    if (
      (
        options.library
        && options.library !== libraryName
      )
      || libraryName.startsWith('.')
    ) {
      continue
    }
    const libraryDirectoryStat = await fsPromises.stat(
      path.join(projectDirectory, DIRECTORY_BENCHMARK, libraryName),
    )
    if (!libraryDirectoryStat.isDirectory()) {
      continue
    }

    const benchmarksDirectory = path.join(
      projectDirectory,
      DIRECTORY_BENCHMARK,
      libraryName,
    )
    const benchmarks = (await fsPromises.readdir(benchmarksDirectory))
      .filter(fileName => fileName.endsWith('.js'))

    // Get library code.
    const libraryPath = path.join(
      projectDirectory,
      DIRECTORY_LIBRARY,
      libraryName + (options.minified ? '.min' : '') + '.js',
    )
    let libraryCode,
      librarySize = 0,
      libraryBrotliSize = 0,
      libraryGzipSize = 0
    if (fs.existsSync(libraryPath)) {
      const libraryStat = await fsPromises.stat(libraryPath)
      librarySize = libraryStat.size

      libraryCode = (
        await fsPromises.readFile(libraryPath, 'utf8')
      ).trimEnd()
      // Remove sourcemap reference.
      const lines = libraryCode.split('\n')
      if (lines[lines.length - 1].startsWith('//# sourceMappingURL=')) {
        lines.pop()
      }
      libraryCode = lines.join('\n')

      if (options.minified) {
        libraryBrotliSize = brotliSizeSync(libraryCode)
        libraryGzipSize = (await gzipAsync(libraryCode)).length
      }

      // Append inline sourcemap.
      const sourceMapPath = libraryPath + '.map'
      if (fs.existsSync(sourceMapPath)) {
        const sourceMapContent = await fsPromises.readFile(sourceMapPath, 'utf8')
        const base64SourceMap = Buffer.from(sourceMapContent).toString('base64')
        libraryCode += '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64SourceMap
      }
    }

    console.log(
      '\n' + libraryName
    )
    if (
      options.minified
      && options.sizes
    ) {
      console.log(
        fmtLabel('Minified')
        + fmtKB(librarySize)
        + '\n'
        + fmtLabel('Min+gzip')
        + fmtKB(libraryGzipSize)
        + ' '
        + fmtPercent((libraryGzipSize / librarySize) * 100)
        + '\n'
        + fmtLabel('Min+brotli')
        + fmtKB(libraryBrotliSize)
        + ' '
        + fmtPercent((libraryBrotliSize / librarySize) * 100)
      )
    }

    if (options.iterations > 0) {
      for (const benchmarkFilePath of benchmarks) {
        const benchmarkPath = path.join(benchmarksDirectory, benchmarkFilePath)
        const benchmarkName = path.basename(benchmarkFilePath, '.js')
        if (
          benchmarkName.startsWith('.')
          || benchmarkName.startsWith('_')
        ) {
          console.log('- ' + benchmarkName.substring(1) + ': skipping')
          continue
        }
        if (
          options.benchmark
          && options.benchmark !== benchmarkName
        ) {
          continue
        }
        const benchmarkCode = await fsPromises.readFile(benchmarkPath)

        const profilePath = (
          options.profile
            ? path.join(
              projectDirectory,
              DIRECTORY_PROFILE,
              libraryName + '-' + benchmarkName,
            )
            : false
        )

        // Run benchmark multiple times for statistics.
        const results = []
        for (let i = 0; i < options.iterations; i++) {
          results.push(
            await runBenchmark(
              browser,
              helpersCode,
              libraryCode,
              benchmarkCode,
              (i === options.iterations - 1) ? profilePath : false,
            ),
          )
        }

        let resultsMessage = '- ' + benchmarkName

        if (
          results.length > 0
          && results[0].setup
        ) {
          const setupMemory = calculateStats(
            results.map(result => result.setup.memory),
          )
          const setupTime = calculateStats(
            results.map(result => result.setup.time),
          )

          resultsMessage +=
            '\n' + fmtLabel('Setup time', '  ')
            + fmtMs(setupTime.average, 'x̄') + ','
            + fmtMs(setupTime.min, '∧') + ','
            + fmtMs(setupTime.max, '∨') + ','
            + fmtPercent(setupTime.marginOfError, '±')
            + '\n' + fmtLabel('Setup memory', '  ')
            + fmtMB(setupMemory.average, 'x̄') + ','
            + fmtMB(setupMemory.min, '∧') + ','
            + fmtMB(setupMemory.max, '∨') + ','
            + fmtPercent(setupMemory.marginOfError, '±')
        }

        if (
          results.length > 0
          && results[0].run
        ) {
          const runMemory = calculateStats(
            results.map(result => result.run.memory),
          )
          const runTime = calculateStats(
            results.map(result => result.run.time),
          )

          resultsMessage +=
            '\n' + fmtLabel('Run time', '  ')
            + fmtMs(runTime.average, 'x̄') + ','
            + fmtMs(runTime.min, '∧') + ','
            + fmtMs(runTime.max, '∨') + ','
            + fmtPercent(runTime.marginOfError, '±')
            + '\n' + fmtLabel('Run memory', '  ')
            + fmtMB(runMemory.average, 'x̄') + ','
            + fmtMB(runMemory.min, '∧') + ','
            + fmtMB(runMemory.max, '∨') + ','
            + fmtPercent(runMemory.marginOfError, '±')
        }

        if (profilePath) {
          resultsMessage +=
            '\n' + fmtLabel('Profile graph at')
            + profilePath.substring(projectDirectory.length + 1)
        }

        console.log(resultsMessage)
      }
    }
  }

  await browser.close()
}

runBenchmarks()
