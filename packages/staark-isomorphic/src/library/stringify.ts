import {
  arrayifyOrUndefined,
} from '@doars/staark-common/src/array.js'
import {
  MemoAbstract,
} from '@doars/staark-common/src/memo.js'
import {
  NodeAbstract,
  NodeAttributes,
  NodeContent,
} from '@doars/staark-common/src/node.js'

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

export type ViewFunction = (
  state: Record<string, any>,
) => NodeContent[] | NodeContent

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g
const HYPHENATE = (
  part: string,
  offset: number,
) => (offset ? '-' : '') + part

const renderAttributes = (
  attributes?: NodeAttributes,
): string => {
  let rendered = ''
  if (attributes) {
    for (const name in attributes) {
      let value = attributes[name]
      if (
        value !== null
        && value !== undefined
      ) {
        const type = typeof (value)

        // Ensure it is of type string.
        if (type === 'boolean') {
          value = value ? 'true' : 'false'
        } else if (type !== 'string') {
          value = value.toString()
        }

        if (name === 'class') {
          if (typeof (value) === 'object') {
            if (Array.isArray(value)) {
              value = value.join(' ')
            } else {
              let classNames: string = ''
              for (const className in value) {
                if (value[className]) {
                  classNames += ' ' + className
                }
              }
              value = classNames
            }
          }
        } else if (name === 'style') {
          if (typeof (value) === 'object') {
            if (Array.isArray(value)) {
              value = value.join(';')
            } else {
              let styles: string = ''
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

        rendered += ' ' + name + '="' + (value as string) + '"'
      }
    }
  }
  return rendered
}

const renderElements = (
  abstracts?: NodeContent[],
): string => {
  let rendered = ''
  if (abstracts) {
    for (const abstract of abstracts) {
      if (abstract) {
        if ((abstract as NodeAbstract).t) {
          rendered += '<' + (abstract as NodeAbstract).t.toLocaleLowerCase() + renderAttributes((abstract as NodeAbstract).a)
          if (SELF_CLOSING.includes((abstract as NodeAbstract).t)) {
            rendered += '/>'
          } else {
            rendered += '>'
            if ((abstract as NodeAbstract).c) {
              rendered += renderElements((abstract as NodeAbstract).c)
            }
            rendered += '</' + (abstract as NodeAbstract).t.toLocaleLowerCase() + '>'
          }
        } else {
          rendered += ' ' + (abstract) + ' '
        }
      }
    }
  }
  return rendered
}

export const stringifyPatch = (
  abstractTree?: NodeContent[] | NodeContent,
): [string, NodeContent[] | undefined] => {
  abstractTree = arrayifyOrUndefined(abstractTree) as NodeContent[] | undefined
  return [
    renderElements(
      abstractTree,
    ),
    abstractTree,
  ]
}

export const stringify = (
  renderView: ViewFunction,
  initialState?: Record<string, any>,
): [string, NodeContent[] | undefined] => {
  if (!initialState) {
    initialState = {}
  }

  const renderElements = (
    abstracts?: NodeContent[],
  ): string => {
    let rendered = ''
    if (abstracts) {
      for (const abstract of abstracts) {
        if (abstract) {
          if ((abstract as MemoAbstract).m) {
            rendered += renderElements(
              arrayifyOrUndefined(
                (abstract as MemoAbstract).r(
                  initialState,
                  (abstract as MemoAbstract).m,
                )
              )
            )
          } else if ((abstract as NodeAbstract).t) {
            rendered += '<' + (abstract as NodeAbstract).t.toLocaleLowerCase() + renderAttributes((abstract as NodeAbstract).a)
            if (SELF_CLOSING.includes((abstract as NodeAbstract).t)) {
              rendered += '/>'
            } else {
              rendered += '>'
              if ((abstract as NodeAbstract).c) {
                rendered += renderElements((abstract as NodeAbstract).c)
              }
              rendered += '</' + (abstract as NodeAbstract).t.toLocaleLowerCase() + '>'
            }
          } else {
            rendered += ' ' + abstract + ' '
          }
        }
      }
    }
    return rendered
  }

  const abstractTree = arrayifyOrUndefined(
    renderView(initialState),
  )
  return [
    renderElements(
      abstractTree,
    ),
    abstractTree,
  ]
}

const customStringify = (
  data?: Record<string, any>,
): string => {
  if (
    typeof data === 'number'
    || typeof data === 'boolean'
  ) {
    return String(data)
  }

  if (typeof data === 'string') {
    // Escape double quotes
    return '"' + (data as string).replace(/"/g, '\\"') + '"'
  }

  if (Array.isArray(data)) {
    return '[' + data.map(item => customStringify(item)).join(',') + ']'
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
      .filter((key: string) => !key.startsWith('_'))
    const objectContent: string = keys
      .map((key: string) => '"' + key + '":' + customStringify(data[key]) + '"')
      .join(',')
    return '{' + objectContent + '}'
  }

  return 'null'
}

export const stringifyPatchFull = (
  abstracts?: NodeContent[],
): [string, string] => {
  const [
    rendered,
    abstractTree,
  ] = stringifyPatch(
    abstracts,
  )

  return [
    rendered,
    customStringify(abstractTree),
  ]
}

export const stringifyFull = (
  renderView: ViewFunction,
  initialState?: Record<string, any>,
): [string, string, string] => {
  if (!initialState) {
    initialState = {}
  }

  const [
    rendered,
    abstractTree,
  ] = stringify(
    renderView,
    initialState
  )

  return [
    rendered,
    customStringify(abstractTree),
    JSON.stringify(initialState)
  ]
}
