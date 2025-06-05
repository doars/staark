import brotliSize from 'brotli-size'
import {
  build,
  context,
} from 'esbuild'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production'

const size = async (
  filePath,
) => {
  let size
  try {
    size = await brotliSize.file(filePath)
  } catch (error) {
    console.log('Unable to determine file size of ' + path.basename(filePath))
    return
  }

  size = (size / 1024).toFixed(2) + 'KB'
  console.log(size + ' is ' + path.basename(filePath) + ' when brotli compressed.')
}

const bundle = (
  ...builds
) => {
  // For production add additional builds.
  if (isProduction) {
    const buildCount = builds.length
    for (let i = 0; i < buildCount; i++) {
      const options = Object.assign({}, builds[i], {
        define: {
          'process.env.NODE_ENV': "'production'",
        },
        drop: [
          'console',
          'debugger',
        ],
        minify: true,
        sourcemap: false,
        target: [
          // Smaller size // Proxy object
          'chrome51', // 49
          'edge20', // 12
          'firefox53', // 39
          'ios11', // 10.2
          'safari11', // 10
        ],
      })

      // Append min suffix to file name for minified builds.
      const suffixes = []
      if (options.minify) {
        suffixes.push('min')
      }
      let filePath = options.outfile.split('.')
      filePath.splice(filePath.length - 1, 0, ...suffixes)
      options.outfile = filePath = filePath.join('.')

      builds.push(options)
    }
  }

  return Promise.all(
    builds.map(options => {
      if (
        !options.entryPoints
        || !options.outfile
      ) {
        console.warn('Bundle options are missing entryPoints or outfile properties.')
        return
      }

      options = Object.assign({
        bundle: true,
        format: 'esm',
        minify: false,
        platform: 'browser',
        sourcemap: true,
      }, options)

      if (!Array.isArray(options.entryPoints)) {
        options.entryPoints = [options.entryPoints,]
      }

      try {
        if (isProduction) {
          return build(options)
            .then(() => {
              if (options.minify) {
                return size(options.outfile)
              }
            })
        } else {
          return context(options)
            .then(context => context.watch())
        }
      } catch (error) {
        console.warn('Error encountered during building.', error)
      }
    })
  )
}

export default async (
  files,
) => {
  if (Array.isArray(files)) {
    for (const file of files) {
      await bundle(file)
    }
  } else {
    await bundle(files)
  }
}
