// Import highlight.js.
import hljs from 'highlight.js'

// Import renderer.
import { render as r } from '../utils/RenderUtils.js'

const { highlight } = hljs

/**
 * Renders a code component.
 * @param {object} options Component options:
 * - {string} language = 'xml' - The language the code is written in.
 * @param {...string} children Rendered elements to add as children.
 * @returns {string} Resulting HTML structure.
 */
export default (
  options,
  ...children
) => {
  // Override default options.
  options = Object.assign({
    language: 'xml',
  }, options)
  options.language = options.language.toLowerCase()
  if (options.language === 'html') {
    options.language = 'xml'
  } else if (options.language === 'js') {
    options.language = 'javascript'
  }

  // prepare contents.
  children = children.flat(4)
  children = children.join('\n')

  return r('pre',
    r('code', {
      class: '-text-2 sm:-text-1',
    }, [
      highlight(children, { language: options.language }).value,
    ]),
  )
}
