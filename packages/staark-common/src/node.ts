import {
  marker,
} from './marker.js'
import {
  MemoAbstract,
} from './memo.js'
import {
  TextAbstract,
} from './text.js'

export type NodeAttributeListener = (
  event: Event
) => unknown

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
  NodeAbstract |
  TextAbstract

export type NodeAbstract = {
  _: Symbol
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
    c: (
      contents
        ? Array.isArray(contents)
          ? contents
          : [contents] as NodeContent[]
        : []
    ),
    t: type.toUpperCase(),
  }
}
