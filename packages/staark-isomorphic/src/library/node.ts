import {
  GenericObject,
} from '@doars/staark-common/src/generics.js'

import {
  marker,
} from './marker.js'
import {
  TextAbstract,
} from './text.js'

export type NodeAttributes =
  GenericObject<
    boolean |
    null |
    number |
    string |
    (number | string)[] |
    GenericObject<number | string>
  >

export type NodeContent =
  string |
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
  attributesOrContents?: NodeAttributes | NodeContent | NodeContent[],
  contents?: NodeContent | NodeContent[],
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
      Array.isArray(contents)
        ? contents
        : [contents] as NodeContent[]
    ),
    t: type.toUpperCase(),
  }
}
