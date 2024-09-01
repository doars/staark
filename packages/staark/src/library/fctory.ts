import {
  tokenizer,
} from '../utilities/selector.js'

import {
  node,
  NodeAbstract,
  NodeAttributes,
  NodeContent,
} from './node.js'

export type Fctory = (
  attributes?: string,
  contents?: NodeContent | NodeContent[],
) => NodeAbstract

export type FctoryCache = {
  [key: string]: Fctory,
}

export const fctory = new Proxy({}, {
  get: (
    target: FctoryCache,
    type: string,
  ): Fctory => {
    if (target[type]) {
      return target[type]
    }

    const typeConverted = (
      type[0] + type.substring(1)
        .replace(
          /([A-Z])/g,
          capital => '-' + capital,
        )
    ).toUpperCase()

    return target[type] = (
      selector?: string,
      contents?: NodeContent | NodeContent[],
    ): NodeAbstract => {
      let attributes: NodeAttributes | undefined
      if (selector) {
        const [_, _attributes] = tokenizer(selector)
        attributes = _attributes
      }
      return node(
        typeConverted,
        attributes,
        contents,
      )
    }
  },
})
