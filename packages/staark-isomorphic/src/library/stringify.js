import {
  arrayifyOrUndefined,
} from '@doars/staark-common/src/array.js'

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
 * @callback ViewFunction Render view function.
 * @param {Record<string, any>} state Current state.
 * @returns {NodeContent[] | NodeContent} Abstract tree.
 */

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g
const HYPHENATE = (part, offset) => (offset ? '-' : '') + part

/**
 * Render attributes to string.
 *
 * @param {NodeAttributes} [attributes] Attributes to render.
 * @returns {string} Rendered attributes.
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
 * Render elements to string.
 *
 * @param {NodeContent[]} [abstracts] Abstract tree.
 * @returns {string} Rendered elements.
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
 * Stringify abstract tree.
 *
 * @param {NodeContent[] | NodeContent} [abstractTree] Abstract tree.
 * @returns {[string, NodeContent[] | undefined]} Rendered elements and abstract tree.
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
 * Stringify view.
 *
 * @param {ViewFunction} renderView Render view function.
 * @param {Record<string, any>} [initialState] Initial state.
 * @returns {[string, NodeContent[] | undefined]} Rendered elements and abstract tree.
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
 * Custom stringify function.
 *
 * @param {Record<string, any>} [data] Data to stringify.
 * @returns {string} Stringified data.
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
 * Stringify patch with abstract tree.
 *
 * @param {NodeContent[]} [abstracts] Abstract tree.
 * @returns {[string, string]} Rendered elements.
 */
export const stringifyPatchFull = (abstracts) => {
  const [rendered, abstractTree] = stringifyPatch(abstracts)

  return [
    rendered,
    customStringify(abstractTree),
  ]
}

/**
 * Stringify view with abstract tree.
 *
 * @param {ViewFunction} renderView Render view function.
 * @param {Record<string, any>} [initialState] Initial state.
 * @returns {[string, string, string]} Rendered elements, abstract tree and initial state.
 */
export const stringifyFull = (
  renderView,
  initialState,
) => {
  if (!initialState) {
    initialState = {}
  }

  const [
    rendered,
    abstractTree,
  ] = stringify(renderView, initialState)

  return [
    rendered,
    customStringify(abstractTree),
    JSON.stringify(initialState)
  ]
}
