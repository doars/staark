// Import renderer.
import { render as r } from '../utils/RenderUtils.js'

/**
 * Renders a logo component.
 * @returns {string} Resulting HTML structure.
 */
export default (
) => {
  return r('span', {
    'aria-hidden': true,
  }, [
    r('span', 'U ˵´ᴥ`U'),
  ])
}
