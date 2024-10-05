import {
  node,
  NodeAttributes,
  NodeContent,
} from "./node"

export const toNode = (
  element: ChildNode,
): NodeContent => {
  if (element instanceof Text) {
    return element.textContent ?? ''
  }

  let attributes: NodeAttributes = {}
  for (let i = 0; i < (element as Element).attributes.length; i++) {
    const attribute = (element as Element).attributes[i]
    attributes[attribute.name] = attribute.value
  }

  const children: NodeContent[] = []
  for (let i = 0; i < element.childNodes.length; i++) {
    children.push(
      toNode(element.childNodes[i]),
    )
  }

  return node(element.nodeName, attributes, children)
}

export const childrenToNodes = (
  element: Element,
) => {
  const children: NodeContent[] = []
  for (let i = 0; i < element.childNodes.length; i++) {
    children.push(
      toNode(element.childNodes[i]),
    )
  }
  return children
}
