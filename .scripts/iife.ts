export const iife = function (
  path: Array<string>,
  data: any
) {
  let subject: Record<string, any> = window
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof (subject[path[i]]) !== 'object' || !Array.isArray(subject[path[i]])) {
      subject[path[i]] = {}
    }
    subject = subject[path[i]]
  }
  subject[path[path.length - 1]] = data
}
