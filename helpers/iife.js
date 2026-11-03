/**
 * Assigns data to window at the given path, creating objects along the path where needed.
 * @param {Array<string>} path Path to assign the values to.
 * @param {any} data Data to assign to the window.
 */
export const iife = (path, data) => {
  let subject = window
  const last = path.pop()
  for (const key of path) {
    subject = subject[key] && typeof subject[key] === 'object' ? subject[key] : (subject[key] = {})
  }
  subject[last] = data
}
