import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import brotliSize from 'brotli-size'

const ARGUMENT_BENCHMARK = '--benchmark='
const ARGUMENT_LIBRARY = '--library='
const ARGUMENT_RUN_COUNT = '--run-count='

const DIRECTORY_BENCHMARK = 'benchmarks'
const DIRECTORY_LIBRARY = 'dst'
const DIRECTORY_PROFILE = 'profiles'

const fmtLabel =
  (value) => '  ' + value.padEnd(13, ' ') + ' '
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
  minified: false,
  profile: false,
  runCount: 16,
}
const args = process.argv.slice(2)
args.forEach(arg => {
  if (arg.startsWith(ARGUMENT_LIBRARY)) {
    // Split at the first '=' and take the second part as the value.
    options.library = arg.substring(ARGUMENT_LIBRARY.length)
  } else if (arg.startsWith(ARGUMENT_BENCHMARK)) {
    options.benchmark = arg.substring(ARGUMENT_BENCHMARK.length)
  } else if (arg.startsWith(ARGUMENT_RUN_COUNT)) {
    options.runCount = Number.parseInt(
      arg.substring(ARGUMENT_RUN_COUNT.length),
    )
  } else if (arg === '--profile') {
    // Set the flag to true if the argument is exactly the flag.
    options.profile = true
  } else if (arg === '--minified') {
    options.minified = true
  }
})

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

  const client = await page.target().createCDPSession()
  await client.send('HeapProfiler.enable');

  await page.addScriptTag({
    content:
      (libraryCode ? libraryCode : '')
      + '(function(){' + helpersCode + '}())'
      + '(function(){' + benchmarkCode + '}())',
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

  const context = await page.evaluateHandle(() => ({
    rootNode: document.querySelector('div'),
    window: window,
  }))

  // TODO: Add sourcemap data.

  const callBenchmark = async (
    functionName,
  ) => {
    let profileData,
      result

    await client.send('HeapProfiler.collectGarbage')

    if (profilePath) {
      await client.send('Profiler.enable')
      await client.send('Profiler.start', {
        includeNativeFunctions: true,
        samplingInterval: 10,
        preciseCoverageDeltaInterval: -1
      })
    }

    const runner = async (context, functionName) => {
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
    result = await page.evaluate(runner, context, functionName)

    if (profilePath) {
      profileData = (await client.send('Profiler.stop', {
        profile: true,
        keepProfile: true,
      })).profile
      if (profileData) {
        const filePath = profilePath + '-' + functionName + '.json'
        const directoryPath = path.dirname(filePath)
        if (directoryPath) {
          if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, true)
          }
        }
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        fs.writeFileSync(filePath, JSON.stringify(profileData))
      }
    }

    return result
  }

  const setupResults = await callBenchmark('setup')
  const runResults = await callBenchmark('run')

  const runner = async (context) => {
    if (context.window.benchmark.cleanup) {
      context.window.benchmark.cleanup(context)
    }
  }
  await page.evaluate(runner, context)

  await client.detach()
  await page.close()

  return {
    setup: setupResults,
    run: runResults,
  }
}

async function runBenchmarks () {
  const browser = await puppeteer.launch({
    headless: 'new',
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
      options.library
      && options.library !== libraryName
    ) {
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
    let libraryCode
    let libraryMinifiedSize = 0
    let libraryCompressedSize = 0
    if (fs.existsSync(libraryPath)) {
      libraryCode = await fsPromises.readFile(libraryPath, 'utf8')
      libraryMinifiedSize = (await fsPromises.stat(libraryPath)).size
      libraryCompressedSize = await brotliSize.sync(libraryCode)
    }

    console.log(
      '\n' + libraryName
    )
    if (options.minified) {
      console.log(
        // fmtLabel('Minified')
        // + fmtKB(libraryMinifiedSize)
        // + '\n' +
        fmtLabel('Min+brotli')
        + fmtKB(libraryCompressedSize)
        // + '\n' + fmtLabel('Space saved')
        // + fmtPercent(
        //   libraryMinifiedSize > 0
        //     ? ((1 - (libraryCompressedSize / libraryMinifiedSize)) * 100)
        //     : 0
        // )
      )
    }

    for (const benchmarkFilePath of benchmarks) {
      const benchmarkPath = path.join(benchmarksDirectory, benchmarkFilePath)
      const benchmarkName = path.basename(benchmarkFilePath, '.js')
      if (benchmarkName.startsWith('_')) {
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
            libraryName,
            benchmarkName
          )
          : false
      )

      // Run benchmark multiple times for statistics.
      const results = []
      for (let i = 0; i < options.runCount; i++) {
        results.push(
          await runBenchmark(
            browser,
            helpersCode,
            libraryCode,
            benchmarkCode,
            (i === options.runCount - 1) ? profilePath : false,
          ),
        )
      }

      let resultsMessage = '- ' + benchmarkName

      if (results[0].setup) {
        const setupMemory = calculateStats(
          results.map(result => result.setup.memory),
        )
        const setupTime = calculateStats(
          results.map(result => result.setup.time),
        )

        resultsMessage +=
          '\n' + fmtLabel('Setup time')
          + fmtMs(setupTime.average, 'x̄') + ','
          + fmtMs(setupTime.min, '∧') + ','
          + fmtMs(setupTime.max, '∨') + ','
          + fmtPercent(setupTime.marginOfError, '±')
          + '\n' + fmtLabel('Setup memory')
          + fmtMB(setupMemory.average, 'x̄') + ','
          + fmtMB(setupMemory.min, '∧') + ','
          + fmtMB(setupMemory.max, '∨') + ','
          + fmtPercent(setupMemory.marginOfError, '±')
      }

      if (results[0].run) {
        const runMemory = calculateStats(
          results.map(result => result.run.memory),
        )
        const runTime = calculateStats(
          results.map(result => result.run.time),
        )

        resultsMessage +=
          '\n' + fmtLabel('Run time')
          + fmtMs(runTime.average, 'x̄') + ','
          + fmtMs(runTime.min, '∧') + ','
          + fmtMs(runTime.max, '∨') + ','
          + fmtPercent(runTime.marginOfError, '±')
          + '\n' + fmtLabel('Run memory')
          + fmtMB(runMemory.average, 'x̄') + ','
          + fmtMB(runMemory.min, '∧') + ','
          + fmtMB(runMemory.max, '∨') + ','
          + fmtPercent(runMemory.marginOfError, '±')
      }

      if (profilePath) {
        resultsMessage +=
          '\n' + fmtLabel('Profile graphs')
          + profilePath.substring(projectDirectory.length + 1)
      }

      console.log(resultsMessage)
    }
  }

  await browser.close()
}

runBenchmarks()
