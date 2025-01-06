import { arrayify } from './array.js'
import { NodeAbstract } from './node.js'

export const match = (
  pattern: any,
  lookup: Record<any, NodeAbstract[] | NodeAbstract | null | undefined>,
): NodeAbstract[] => {
  if (
    lookup
    && (pattern in lookup)
    && lookup[pattern]
  ) {
    return arrayify(lookup[pattern])
  }
  return []
}
