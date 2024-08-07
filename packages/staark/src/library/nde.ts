import {
  tokenizer,
} from '@doars/staark-common/src/selector.js'

import {
  marker,
} from './marker.js'
import {
  NodeAbstract,
  NodeContent,
} from './node.js'

export const nde = (
  selector: string,
  contents?: NodeContent | NodeContent[],
): NodeAbstract => {
  const [type, attributes] = tokenizer(selector)
  return {
    _: marker,
    a: attributes,
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
