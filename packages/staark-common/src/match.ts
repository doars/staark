import { arrayify } from './array.js'
import { NodeAbstract } from './node.js'

type ResolveFunction = () => NodeAbstract[] | NodeAbstract | null | undefined

export const match = (
  pattern: any,
  lookup: Record<any, NodeAbstract[] | NodeAbstract | ResolveFunction | null | undefined>,
  fallback: NodeAbstract[] | NodeAbstract | ResolveFunction | null | undefined,
): NodeAbstract[] => {
  let result: NodeAbstract[] | NodeAbstract | ResolveFunction | null | undefined
  if (
    lookup
    && (pattern in lookup)
    && lookup[pattern]
  ) {
    result = lookup[pattern]
  } else {
    result = fallback
  }
  if (typeof (result) === 'function') {
    result = result()
  }
  return arrayify(result)
}
