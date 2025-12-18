import { file as fileSize } from 'brotli-size'
import fs from 'fs'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production'

const performBuilds = async (
  builds,
) => {
  return Promise.all(
    builds.map(
      async (options) => {
        try {
          const result = await Bun.build(options)
          if (!result.success) {
            console.warn('Build failed', result.logs)
            return
          }

          if (
            isProduction
            && options.minify
          ) {
            let size = await fileSize(options.outfile)
            size = (size / 1024).toFixed(2) + 'KB'
            console.log(size + ' is ' + path.basename(options.outfile) + ' when brotli compressed.')
          }
        } catch (error) {
          console.error('Rebuild failed for', options.outfile, error)
        }
      },
    ),
  )
}

const bundle = async (
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

  const watchedDirectories = new Set()

  for (let i = builds.length - 1; i >= 0; i--) {
    let options = builds[i]

    if (
      !options.entrypoints
      || !options.outfile
    ) {
      console.warn('Bundle options are missing entrypoints or outfile properties.')
      // Remove from list.
      builds.splice(i, 1)
      continue
    }

    const outfile = path.parse(options.outfile)
    builds[i] = options = Object.assign({
      format: 'esm',
      minify: false,
      naming: "[dir]/" + outfile.base,
      outdir: outfile.dir,
      sourcemap: 'external',
      target: 'browser',
    }, options)

    if (!Array.isArray(options.entrypoints)) {
      options.entrypoints = [
        options.entrypoints,
      ]
    }

    if (!isProduction) {
      watchedDirectories.add(
        path.dirname(options.entrypoints[0]),
      )
    }
  }

  performBuilds(builds)
  console.log('Bundles build')

  if (!isProduction) {
    for (const watchDirectory of watchedDirectories) {
      fs.watch(watchDirectory, {
        recursive: true,
      }, async (_eventType, filename) => {
        if (
          !filename
          || !filename.endsWith('.js')
        ) {
          return
        }

        console.log('Rebuilding bundles. File changed:', filename)
        await performBuilds(builds)
        console.log('Bundles rebuild')
      })
      console.log('Watching for file changes in:', watchDirectory)
    }
  }
}

export default async (
  files,
) => {
  if (!Array.isArray(files)) {
    files = [
      files,
    ]
  } else {
    files = files.flat()
  }
  await bundle(...files)
}
