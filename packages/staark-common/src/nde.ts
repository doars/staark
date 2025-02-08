import {
  marker,
} from './marker.js'
import {
  NodeAbstract,
  NodeContent,
} from './node.js'
import {
  selectorToTokenizer,
} from './selector.js'

export const nde = (
  selector: string,
  contents?: NodeContent[] | NodeContent,
): NodeAbstract => {
  const [type, attributes] = selectorToTokenizer(selector)

  return {
    _: marker,
    a: attributes,
    c: (
      contents
        ? Array.isArray(contents)
          ? contents
          : [contents] as NodeContent[]
        : undefined
    ),
    t: type.toUpperCase(),
  }
}
