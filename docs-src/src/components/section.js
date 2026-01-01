// Import renderer.
import { render as r } from '../utils/RenderUtils.js'

/**
 * Renders a section component.
 * @param {...string} children Rendered elements to add as children.
 * @returns {string} Resulting HTML structure.
 */
export default (
  ...children
) => {
  return r('section', {
    class: 'container px-2',
  }, children)
}
