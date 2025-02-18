import { arrayify } from './array.js'
import { NodeAbstract } from './node.js'

type ResolveFunction = () => NodeAbstract[] | NodeAbstract | null | undefined

export const conditional = (
  condition: any,
  onTruth: NodeAbstract[] | NodeAbstract | ResolveFunction,
  onFalse?: NodeAbstract[] | NodeAbstract | ResolveFunction,
): NodeAbstract[] => {
  let result: NodeAbstract[] | NodeAbstract | ResolveFunction | null | undefined = (
    condition
      ? onTruth
      : onFalse
  )
  if (typeof (result) === 'function') {
    result = result()
  }
  return arrayify(result)
}
