import { arrayify } from './array.js'
import { NodeContent } from './node.js'

type ResolveFunction = () => NodeContent[] | NodeContent | null | undefined

export const match = (
  key: any,
  lookup: Record<any, NodeContent[] | NodeContent | ResolveFunction | null | undefined>,
  fallback: NodeContent[] | NodeContent | ResolveFunction | null | undefined,
): NodeContent[] => {
  let result: NodeContent[] | NodeContent | ResolveFunction | null | undefined
  if (
    lookup
    && (key in lookup)
    && lookup[key]
  ) {
    result = lookup[key]
  } else {
    result = fallback
  }
  if (typeof (result) === 'function') {
    result = result()
  }
  return arrayify(result)
}
