// Import renderer.
import { render as r } from '../utils/RenderUtils.js'

/**
 * Renders a carousel component.
 * @param {object} options Component options:
 * - {string} align = 'center' - Alignment of the carousel contents.
 * - {boolean} alignOnHover = false - Whether to rotate that cards when not hovering over them.
 * - {width} width = 'w-24' - The width class of the cards.
 * @param {...string} children Rendered elements to add as children.
 * @returns {string} Resulting HTML structure.
 */
export default (
  options,
  ...children
) => {
  options = Object.assign({
    align: 'center',
    alignOnHover: false,
    width: 'w-24',
  }, options)

  let alignment
  switch (options.align.toLowerCase()) {
    case 'top':
      alignment = 'items-top'
      break

    case 'bottom':
      alignment = 'items-bottom'
      break

    default:
      alignment = 'items-center'
      break
  }

  // Flatten contents.
  children = children.flat(4)

  return r('div', {
    class: 'no-scrollbar overflow-x-scroll',
  }, [
    r('div', {
      class: 'table mx-auto',
    }, [
      r('ul', {
        class: 'inline-flex py-2 px-1 ' + alignment,
      }, [
        ...children.map(
          (content, index) => {
            let transform = ''
            if (options.alignOnHover) {
              // Set the rotation of the item with every third randomized.
              transform = ' rotate-2'
              index = index % 3
              if (index === 1 || (index === 2 && Math.random() < 0.5)) {
                transform = ' -rotate-2'
              }
              // Re-align on hover.
              transform += ' hover:rotate-0 hover:scale-110'
            }

            // Return wrapped content.
            return r('div', {
              class: 'mx-1 transform ' + options.width + transform,
            }, content)
          }),
      ]),
    ]),
  ])
}
