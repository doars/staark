import {
  arrayify,
} from '@doars/staark-common/src/array.js'
import {
  GenericObject,
  GenericObjectAny,
} from '@doars/staark-common/src/generics.js'

import {
  NodeAbstract,
  NodeAttributes,
  NodeContent,
} from './node.js'
import {
  TextAbstract,
} from './text.js'

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
  state: GenericObject<any>,
) => NodeContent | NodeContent[]

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g
const HYPHENATE = (
  part: string,
  offset: number,
) => (offset ? '-' : '') + part

const renderAttributes = (
  attributes: NodeAttributes | null = null,
): string => {
  let rendered = ''
  if (attributes) {
    for (const name in attributes) {
      let value = attributes[name]
      if (value !== null) {
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
                let styleValue: string | number | (string | number)[] = value[styleProperty]

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
  abstracts: NodeContent[] | null = null,
): string => {
  let rendered = ''
  if (abstracts) {
    for (const abstract of abstracts) {
      if ((abstract as NodeAbstract).t) {
        rendered += '<' + (abstract as NodeAbstract).t + renderAttributes((abstract as NodeAbstract).a)
        if (SELF_CLOSING.includes((abstract as NodeAbstract).t)) {
          rendered += '/>'
        } else {
          rendered += '>'
          if ((abstract as NodeAbstract).c) {
            rendered += renderElements((abstract as NodeAbstract).c)
          }
          rendered += '<' + (abstract as NodeAbstract).t + '>'
        }
      } else {
        rendered += ' ' + (
          (abstract as TextAbstract).c ? (abstract as TextAbstract).c : (abstract as string)
        ) + ' '
      }
    }
  }
  return rendered
}

export const stringify = (
  renderView: ViewFunction,
  initialState?: GenericObject<any>,
): [string, NodeContent[]] => {
  if (!initialState) {
    initialState = {}
  }

  const abstractTree = arrayify(
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
  data: GenericObjectAny,
): string => {
  if (
    typeof data === 'number'
    || typeof data === 'boolean'
  ) {
    return String(data)
  }

  if (typeof data === 'string') {
    // Escape double quotes
    return `"${(data as string).replace(/"/g, '\\"')}"`
  }

  if (Array.isArray(data)) {
    return `[${data.map(item => customStringify(item)).join(',')}]`;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
      .filter((key: string) => !key.startsWith('_'))
    const objectContent: string = keys
      .map((key: string) => `"${key}":${customStringify(data[key])}`)
      .join(',')
    return `{${objectContent}}`
  }

  // For any unsupported types (like functions or undefined).
  return 'null'
}

export const stringifyFull = (
  renderView: ViewFunction,
  initialState?: GenericObject<any>,
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
