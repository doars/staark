import {
  node,
  NodeAbstract,
  NodeAttributes,
  NodeContent,
} from './node.js'

export type Factory = (
  attributesOrContents?: NodeAttributes | NodeContent[] | NodeContent,
  contents?: NodeContent[] | NodeContent,
) => NodeAbstract

export type FactoryCache = {
  [key: string]: Factory,
}

export const factory = new Proxy({}, {
  get: (
    target: FactoryCache,
    type: string,
  ): Factory => {
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
      attributesOrContents?: NodeAttributes | NodeContent[] | NodeContent,
      contents?: NodeContent[] | NodeContent,
    ): NodeAbstract => node(
      typeConverted,
      attributesOrContents,
      contents,
    )
  },
})
