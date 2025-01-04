import { promises as fs } from 'fs'
import { watch } from 'chokidar'

import Postcss from 'postcss'
import postcssNano from 'cssnano'
import postcssImport from 'postcss-import'
import postcssNesting from 'postcss-nesting'
import postcssPresetEnv from 'postcss-preset-env'

export default async (
  options = {},
) => {
  // Setup build options with standard plugins.
  const buildsOptions = [Object.assign({
    map: {
      annotation: false,
      inline: false,
      prev: false,
      sourcesContent: false,
    },
    minify: false,
    plugins: [
      postcssImport(),
      postcssNesting(),
    ],
  }, options)]

  // Add additional plugins when running in production.
  if (process.env.NODE_ENV === 'production') {
    // Shallow copy builds with minification.
    const buildLength = buildsOptions.length
    for (let i = 0; i < buildLength; i++) {
      // Clone options.
      const buildOptions = Object.assign({}, buildsOptions[i])
      buildOptions.plugins = [
        ...buildOptions.plugins,
      ]

      if (buildOptions.map) {
        buildOptions.map.annotation = true
      }
      buildOptions.minify = true
      buildOptions.plugins.push(
        postcssPresetEnv(),
        postcssNano(),
      )

      // Construct target file path.
      const suffixes = [
        'min',
      ]
      let filePath = buildOptions.to.split('.')
      filePath.splice(filePath.length - 1, 0, ...suffixes)
      buildOptions.to = filePath.join('.')

      buildsOptions.push(buildOptions)
    }
  }

  for (const buildOptions of buildsOptions) {
    const build = async () => {
      // Retrieve the stylesheets.
      let stylesheet
      try {
        stylesheet = await fs.readFile(options.from, 'utf-8')
      } catch (error) {
        console.error('Unable to retrieve stylesheet from: ' + options.from)
        return
      }

      let result = null
      try {
        const postcss = new Postcss(buildOptions.plugins)
        result = await postcss.process(stylesheet, buildOptions)
      } catch {
        console.error('Error encountered during PostCSS transpiling.')
      }

      // Write results to disk.
      await fs.writeFile(buildOptions.to, result.css, 'utf-8')
      if (result.map) {
        await fs.writeFile(buildOptions.to + '.map', JSON.stringify(result.map), 'utf-8')
      }
    }

    // Build again on changes.
    if (process.env.NODE_ENV === 'production') {
      await build()
    } else {
      let extension = buildOptions.from.split('.')
      extension = extension[extension.length - 1]
      watch('./src/**/*.' + extension)
        .on('add', build)
        .on('change', build)
        .on('remove', build)
    }
  }
}
