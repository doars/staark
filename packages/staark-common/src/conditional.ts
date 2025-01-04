import { arrayify } from './array.js'
import { NodeAbstract } from './node.js'

export const conditional = (
  condition: any,
  onTruth: NodeAbstract[] | NodeAbstract,
  onFalse?: NodeAbstract[] | NodeAbstract,
): NodeAbstract[] => {
  if (condition) {
    return arrayify(onTruth)
  }
  return arrayify(onFalse ?? [])
}
