import {
  node,
  NodeAttributes,
  NodeContent,
} from './node.js'

export const childrenToNodes = (
  element: Element | ChildNode,
) => {
  const abstractChildNodes: NodeContent[] = []
  for (let i = 0; i < element.childNodes.length; i++) {
    const childNode = element.childNodes[i]
    if (childNode instanceof Text) {
      abstractChildNodes.push(
        childNode.textContent ?? ''
      )
    } else {
      let attributes: NodeAttributes = {}
      for (let i = 0; i < (childNode as Element).attributes.length; i++) {
        const attribute = (childNode as Element).attributes[i]
        attributes[attribute.name] = attribute.value
      }

      abstractChildNodes.push(
        node(
          childNode.nodeName,
          attributes,
          childrenToNodes(childNode),
        )
      )
    }
  }
  return abstractChildNodes
}
