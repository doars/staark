import { arrayify } from './array.js'
import { NodeContent } from './node.js'

type ResolveFunction = () => NodeContent[] | NodeContent | null | undefined

export const conditional = (
  condition: any,
  onTruth: NodeContent[] | NodeContent | ResolveFunction,
  onFalse?: NodeContent[] | NodeContent | ResolveFunction,
): NodeContent[] => {
  let result: NodeContent[] | NodeContent | ResolveFunction | null | undefined = (
    condition
      ? onTruth
      : onFalse
  )
  if (typeof (result) === 'function') {
    result = result()
  }
  return arrayify(result)
}
