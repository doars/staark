import {
  arrayifyOrUndefined
} from './array.js'
import {
  marker,
} from './marker.js'
import {
  MemoAbstract,
} from './memo.js'

type _NodeAttributeListener = {
  (event: Event, state: Record<string, any>): unknown
  (event: Event): unknown
  (): unknown
}

export interface NodeAttributeListener extends _NodeAttributeListener {
  f?: _NodeAttributeListener
}

export type NodeAttributes =
  Record<string,
    boolean |
    null |
    number |
    string |
    (number | string)[] |
    NodeAttributeListener |
    Record<string,
      boolean | number | string
    >
  >

export type NodeContent =
  string |
  MemoAbstract |
  NodeAbstract

export type NodeAbstract = {
  // Discriminator
  _: string,
  // Attributes
  a?: NodeAttributes
  // Content
  c?: NodeContent[]
  // Node type
  t: string
}

export const node = (
  type: string,
  attributesOrContents?: NodeAttributes | NodeContent[] | NodeContent,
  contents?: NodeContent[] | NodeContent,
): NodeAbstract => {
  if (
    typeof (attributesOrContents) !== 'object'
    || (attributesOrContents as NodeAbstract)._ === marker
    || Array.isArray(attributesOrContents)
  ) {
    contents = attributesOrContents as NodeContent
    attributesOrContents = undefined
  }

  return {
    _: marker,
    a: attributesOrContents as (NodeAttributes | undefined),
    c: arrayifyOrUndefined(contents) as NodeContent[] | undefined,
    t: type.toUpperCase(),
  }
}
