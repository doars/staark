import {
  node,
  NodeAttributes,
  NodeContent,
} from './node.js'

export const childrenToNodes = (
  element: Element | ChildNode,
) => {
  const children: NodeContent[] = []
  for (let i = 0; i < element.childNodes.length; i++) {
    if (element instanceof Text) {
      children.push(
        element.textContent ?? ''
      )
    } else {
      let attributes: NodeAttributes = {}
      for (let i = 0; i < (element as Element).attributes.length; i++) {
        const attribute = (element as Element).attributes[i]
        attributes[attribute.name] = attribute.value
      }

      children.push(
        node(
          element.nodeName,
          attributes,
          childrenToNodes(element),
        )
      )
    }
  }
  return children
}
