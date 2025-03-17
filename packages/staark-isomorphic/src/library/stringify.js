import { arrayifyOrUndefined } from '@doars/staark-common/src/array.js'

const SELF_CLOSING = [
  'base',
  'br',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'wbr',
]

/**
 * @typedef {import('@doars/staark-common/src/node.js').NodeContent} NodeContent
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributes} NodeAttributes
 * @typedef {import('@doars/staark-common/src/node.js').NodeAbstract} NodeAbstract
 * @typedef {import('@doars/staark-common/src/memo.js').MemoAbstract} MemoAbstract
 */

/**
 * @callback ViewFunction
 * @param {Record<string, any>} state
 * @returns {NodeContent[] | NodeContent}
 */

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g
const HYPHENATE = (part, offset) => (offset ? '-' : '') + part

/**
 * @param {NodeAttributes} [attributes]
 * @returns {string}
 */
const renderAttributes = (
  attributes,
) => {
  let rendered = ''
  if (attributes) {
    for (const name in attributes) {
      let value = attributes[name]
      if (value !== null && value !== undefined) {
        const type = typeof value

        // Ensure it is of type string.
        if (type === 'boolean') {
          value = value ? 'true' : 'false'
        } else if (type !== 'string') {
          value = value.toString()
        }

        if (name === 'class') {
          if (typeof value === 'object') {
            if (Array.isArray(value)) {
              value = value.join(' ')
            } else {
              let classNames = ''
              for (const className in value) {
                if (value[className]) {
                  classNames += ' ' + className
                }
              }
              value = classNames
            }
          }
        } else if (name === 'style') {
          if (typeof value === 'object') {
            if (Array.isArray(value)) {
              value = value.join(';')
            } else {
              let styles = ''
              for (let styleProperty in value) {
                let styleValue = value[styleProperty]

                // Convert to kebab case.
                styleProperty = styleProperty
                  .replace(MATCH_CAPITALS, HYPHENATE)
                  .toLowerCase()

                if (Array.isArray(styleValue)) {
                  styles += ';' + styleProperty + ':' + styleValue.join(' ')
                } else if (value) {
                  styles += ';' + styleProperty + ':' + value
                }
              }
              value = styles
            }
          }
        }

        rendered += ' ' + name + '="' + value + '"'
      }
    }
  }
  return rendered
}

/**
 * @param {NodeContent[]} [abstracts]
 * @returns {string}
 */
const renderElements = (
  abstracts,
) => {
  let rendered = ''
  if (abstracts) {
    for (const abstract of abstracts) {
      if (abstract) {
        if (abstract.t) {
          rendered += '<' + abstract.t.toLocaleLowerCase() + renderAttributes(abstract.a)
          if (SELF_CLOSING.includes(abstract.t)) {
            rendered += '/>'
          } else {
            rendered += '>'
            if (abstract.c) {
              rendered += renderElements(abstract.c)
            }
            rendered += '</' + abstract.t.toLocaleLowerCase() + '>'
          }
        } else {
          rendered += ' ' + abstract + ' '
        }
      }
    }
  }
  return rendered
}

/**
 * @param {NodeContent[] | NodeContent} [abstractTree]
 * @returns {[string, NodeContent[] | undefined]}
 */
export const stringifyPatch = (
  abstractTree,
) => {
  abstractTree = arrayifyOrUndefined(abstractTree)
  return [
    renderElements(abstractTree),
    abstractTree,
  ]
}

/**
 * @param {ViewFunction} renderView
 * @param {Record<string, any>} [initialState]
 * @returns {[string, NodeContent[] | undefined]}
 */
export const stringify = (
  renderView,
  initialState,
) => {
  if (!initialState) {
    initialState = {}
  }

  /**
   * @param {NodeContent[]} [abstracts]
   * @returns {string}
   */
  const renderElements = (
    abstracts,
  ) => {
    let rendered = ''
    if (abstracts) {
      for (const abstract of abstracts) {
        if (abstract) {
          if (abstract.m) {
            rendered += renderElements(
              arrayifyOrUndefined(
                abstract.r(initialState, abstract.m)
              )
            )
          } else if (abstract.t) {
            rendered += '<' + abstract.t.toLocaleLowerCase() + renderAttributes(abstract.a)
            if (SELF_CLOSING.includes(abstract.t)) {
              rendered += '/>'
            } else {
              rendered += '>'
              if (abstract.c) {
                rendered += renderElements(abstract.c)
              }
              rendered += '</' + abstract.t.toLocaleLowerCase() + '>'
            }
          } else {
            rendered += ' ' + abstract + ' '
          }
        }
      }
    }
    return rendered
  }

  const abstractTree = arrayifyOrUndefined(renderView(initialState))
  return [
    renderElements(abstractTree),
    abstractTree,
  ]
}

/**
 * @param {Record<string, any>} [data]
 * @returns {string}
 */
const customStringify = (
  data,
) => {
  if (
    typeof data === 'number'
    || typeof data === 'boolean'
  ) {
    return String(data)
  }

  if (typeof data === 'string') {
    // Escape double quotes
    return '"' + data.replace(/"/g, '\\"') + '"'
  }

  if (Array.isArray(data)) {
    return '[' + data.map(
      item => customStringify(item)
    ).join(',') + ']'
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
      .filter(key => !key.startsWith('_'))
    const objectContent = keys
      .map(key => '"' + key + '":' + customStringify(data[key]) + '"')
      .join(',')
    return '{' + objectContent + '}'
  }

  return 'null'
}

/**
 * @param {NodeContent[]} [abstracts]
 * @returns {[string, string]}
 */
export const stringifyPatchFull = (abstracts) => {
  const [rendered, abstractTree] = stringifyPatch(abstracts)

  return [
    rendered,
    customStringify(abstractTree),
  ]
}

/**
 * @param {ViewFunction} renderView
 * @param {Record<string, any>} [initialState]
 * @returns {[string, string, string]}
 */
export const stringifyFull = (
  renderView,
  initialState,
) => {
  if (!initialState) {
    initialState = {}
  }

  const [rendered, abstractTree] = stringify(renderView, initialState)

  return [
    rendered,
    customStringify(abstractTree),
    JSON.stringify(initialState)
  ]
}
