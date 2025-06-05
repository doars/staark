/**
 * Assigns data to window at the given path. If an object at the path already exists it will merge them instead of replacing it.
 * @param {Array<string>} path Path to assign the values to.
 * @param {any} data Data to assign to the window.
 */
export const iife = (
  path,
  data,
) => {
  let subject = window
  for (let i = 0; i < path.length - 1; i++) {
    if (
      typeof (subject[path[i]]) !== 'object'
      || !Array.isArray(subject[path[i]])
    ) {
      subject[path[i]] = {}
    }
    subject = subject[path[i]]
  }
  subject[path[path.length - 1]] = data
}
