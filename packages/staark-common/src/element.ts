import {
  node,
  NodeAttributes,
  NodeContent,
} from './node.js'

export const childrenToNodes = (
  element: Element | ChildNode,
) => {
  const abstractChildNodes: NodeContent[] = []
  for (const childNode of element.childNodes) {
    if (childNode instanceof Text) {
      abstractChildNodes.push(
        childNode.textContent ?? ''
      )
    } else {
      const elementChild = childNode as Element
      const attributes: NodeAttributes = {}
      for (const attribute of elementChild.attributes) {
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
