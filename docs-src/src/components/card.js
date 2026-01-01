// Import from node.
import { readFileSync } from 'fs'

// Import renderer.
import { render as r } from '../utils/RenderUtils.js'

// Import icon components.
const iconOpen = readFileSync('src/icons/open-outline.svg')

/**
 * Renders a card component.
 * @param {object} options Component options.
 * - {string | null} href = null - URL that the card links to.
 * - {string} target = '_blank' - Link target of the card.
 * @param {string} title Card description text.
 * @param {string} description Card description text.
 * @param {...string} children Rendered elements to add as children.
 * @returns {string} Resulting HTML structure.
 */
export default (
  options = {},
  title = '',
  description = '',
  ...children
) => {
  // Override default options.
  options = Object.assign({
    href: null,
    target: '_blank',
  }, options)

  const tag = options.href ? 'a' : 'div'
  const attributes = {
    class: 'card',
  }
  const content = [
    r('div', {
      class: 'heading text-2',
    }, title),

    r('p', description),

    ...children,
  ]

  if (options.href) {
    attributes.href = options.href
    if (options.target) {
      attributes.target = options.target
    }

    content.push(
      r('p', {
        class: 'hover-a:underline text-0',
      }, [
        'Learn more ',
        iconOpen,
      ]),
    )
  }

  return r(tag, attributes, content)
}
