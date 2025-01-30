import { arrayify } from './array.js'
import { NodeAbstract } from './node.js'

type ResolveFunction = () => NodeAbstract[] | NodeAbstract | null | undefined

export const match = (
  pattern: any,
  lookup: Record<any, NodeAbstract[] | NodeAbstract | ResolveFunction | null | undefined>,
): NodeAbstract[] => {
  if (
    lookup
    && (pattern in lookup)
    && lookup[pattern]
  ) {
    let result: NodeAbstract[] | NodeAbstract | ResolveFunction | null | undefined = lookup[pattern]
    if (typeof (result) === 'function') {
      result = result()
      if (!result) {
        return []
      }
    }
    return arrayify(result)
  }
  return []
}
