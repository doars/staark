import { build, context } from 'esbuild'
import { size } from './size.js'

const run = async (
  options = {},
) => {
  // Ensure formats are set.
  const buildsOptions = [{
    minify: false,
  }]

  if (process.env.NODE_ENV === 'production') {
    // For production builds add the minified files as well.
    buildsOptions.push({
      minify: true,
      drop: [
        'console',
        'debugger',
      ],
    })
  }

  for (let buildOptions of buildsOptions) {
    // Setup build options.
    buildOptions = Object.assign({
      entryPoints: null,
      outfile: null,
      format: 'esm',

      bundle: true,
      sourcemap: true,

      platform: 'browser',
      plugins: [],

      target: process.env.NODE_ENV === 'production' ? [
        'chrome51', // 'chrome49',
        'edge20', // edge12
        'firefox53', // 'firefox39',
        'ios11', // 'ios10.2',
        'safari11', // 'safari10',
      ] : [],
    }, options, buildOptions)

    // Re-assign from and to paths.
    if (buildOptions.from) {
      buildOptions.entryPoints = buildOptions.from
      delete buildOptions.from
    }
    if (buildOptions.to) {
      buildOptions.outfile = buildOptions.to
      delete buildOptions.to
    }

    // Setup file paths.
    if (!Array.isArray[buildOptions.entryPoints]) {
      buildOptions.entryPoints = [buildOptions.entryPoints]
    }

    // Construct target file path.
    const suffixes = []
    if (buildOptions.minify) {
      suffixes.push('min')
    }
    let filePath = buildOptions.outfile.split('.')
    filePath.splice(filePath.length - 1, 0, ...suffixes)
    buildOptions.outfile = filePath = filePath.join('.')

    if (process.env.NODE_ENV === 'production') {
      // Build library.
      try {
        await build(buildOptions)
      } catch {
        console.error('Error encountered during ESBuild transpiling.')
      }
      if (buildOptions.minify) {
        await size(filePath)
      }
    } else {
      try {
        await (await context(buildOptions)).watch()
      } catch {
        console.error('Error encountered during ESBuild transpiling.')
      }
    }
  }
}

export default async (
  files
) => {
  if (!Array.isArray(files)) {
    await run(files)
    return
  }

  for (const file of files) {
    await run(file)
  }
}
