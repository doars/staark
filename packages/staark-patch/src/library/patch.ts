import {
  arrayifyOrUndefined,
} from '@doars/staark-common/src/array.js'
import {
  childrenToNodes,
} from '@doars/staark-common/src/element.js'
import {
  NodeAbstract,
  NodeAttributes,
  NodeAttributeListener,
  NodeContent,
} from '@doars/staark-common/src/node.js'

export type PatchFunction = (
  newAbstractTree: NodeContent[] | NodeContent,
) => void

const updateAttributes = (
  element: Element,
  newAttributes?: NodeAttributes,
  oldAttributes?: NodeAttributes,
): void => {
  if (newAttributes) {
    for (const name in newAttributes) {
      let value = newAttributes[name]
      if (value) {
        const type = typeof (value)
        if (type === 'function') {
          const oldValue = oldAttributes?.[name]
          if (oldValue !== value) {
            if (oldValue) {
              element.removeEventListener(
                name,
                oldValue as NodeAttributeListener,
              )
            }

            element.addEventListener(
              name,
              value as NodeAttributeListener,
            )
          }
        } else {
          if (name === 'class') {
            if (typeof (value) === 'object') {
              if (Array.isArray(value)) {
                value = value.join(' ')
              } else {
                let classNames: string = ''
                for (const className in value) {
                  if (value[className]) {
                    classNames += ' ' + className
                  }
                }
                value = classNames
              }
            }
            element.className = value as string
          } else if (
            name === 'style'
            && typeof (value) === 'object'
          ) {
            // Apply updated styles.
            for (let styleName in value) {
              let styleValue = (
                value as Record<string, boolean | string | null | undefined | number | (boolean | string | number)[]>
              )[styleName]
              if (styleName.includes('-', 1)) {
                (element as HTMLElement).style.setProperty(
                  styleName,
                  styleValue as string,
                )
              } else {
                // @ts-ignore
                (element as HTMLElement).style[styleName] = styleValue as string
              }
            }

            // Remove old styles.
            if (
              oldAttributes
              && oldAttributes[name]
              && typeof (oldAttributes[name]) === 'object'
              && !Array.isArray(oldAttributes[name])
            ) {
              for (let styleName in oldAttributes[name]) {
                if (!(styleName in value)) {
                  if (styleName.includes('-')) {
                    (element as HTMLElement).style.removeProperty(
                      styleName,
                    )
                  } else {
                    // @ts-ignore
                    delete (element as HTMLElement).style[styleName]
                  }
                }
              }
            }
          } else {
            // Ensure it is of type string.
            if (value === true) {
              value = 'true'
            } else if (type !== 'string') {
              value = value.toString()
            }

            element.setAttribute(name, (value as string))
          }
        }
      }
    }
  }

  // Cleanup old attributes.
  if (oldAttributes) {
    for (const name in oldAttributes) {
      if (
        !newAttributes
        || !newAttributes[name]
      ) {
        if (typeof (oldAttributes[name]) === 'function') {
          element.removeEventListener(
            name,
            oldAttributes[name] as NodeAttributeListener,
          )
        } else if (name === 'class') {
          element.className = ''
        } else if (name === 'style') {
          (element as HTMLElement).style.cssText = ''
        } else if (name === 'value') {
          (element as HTMLInputElement).value = ''
          // Don't dispatch the input change event, the rerendering should update everything: element.dispatchEvent(new Event('change'))
        } else {
          element.removeAttribute(name)
        }
      }
    }
  }
}

const updateElementTree = (
  element: Element,
  newChildAbstracts?: NodeContent[],
  oldChildAbstracts?: NodeContent[],
): void => {
  let newIndex = 0
  let newCount = 0
  if (newChildAbstracts) {
    for (; newIndex < newChildAbstracts.length; newIndex++) {
      const newAbstract = newChildAbstracts[newIndex]

      // Try to find the matching old abstract.
      let matched = false
      if (oldChildAbstracts) {
        for (let oldIndex = newIndex - newCount; oldIndex < oldChildAbstracts.length; oldIndex++) {
          const oldAbstract = oldChildAbstracts[oldIndex]
          if (
            (
              (oldAbstract as NodeAbstract).t
              && (newAbstract as NodeAbstract).t === (oldAbstract as NodeAbstract).t
            )
            || (
              !(oldAbstract as NodeAbstract).t
              && !(newAbstract as NodeAbstract).t
            )
          ) {
            matched = true

            if (newIndex !== (oldIndex + newCount)) {
              // Move node in dom.
              element.insertBefore(
                element.childNodes[oldIndex + newCount],
                element.childNodes[newIndex],
              )
              // Move node in abstract tree. TODO: Remove this pesky splicing so the old abstract tree is not mutated.
              oldChildAbstracts.splice(
                newIndex - newCount,
                0,
                oldChildAbstracts.splice(
                  oldIndex,
                  1,
                )[0]
              )
            }

            if ((newAbstract as NodeAbstract).t) {
              updateAttributes(
                (element.childNodes[newIndex] as Element),
                (newAbstract as NodeAbstract).a,
                (oldAbstract as NodeAbstract).a,
              )
              updateElementTree(
                (element.childNodes[newIndex] as Element),
                (newAbstract as NodeAbstract).c,
                (oldAbstract as NodeAbstract).c,
              )
            } else if (oldAbstract !== newAbstract) {
              element.childNodes[newIndex].textContent = newAbstract as string
            }
            break
          }
        }
      }

      if (!matched) {
        let newNode: Node
        if ((newAbstract as NodeAbstract).t) {
          newNode = document.createElement(
            (newAbstract as NodeAbstract).t,
          )
          updateAttributes(
            newNode as HTMLElement,
            (newAbstract as NodeAbstract).a,
          )
          updateElementTree(
            newNode as HTMLElement,
            (newAbstract as NodeAbstract).c,
          )
        } else {
          newNode = document.createTextNode(
            newAbstract as string,
          )
        }

        element.insertBefore(
          newNode,
          element.childNodes[newIndex],
        )
        newCount++
      }
    }
  }

  // Remove old elements.
  if (oldChildAbstracts) {
    const elementLength = oldChildAbstracts.length + newCount
    if (elementLength >= newIndex) {
      for (let i = elementLength - 1; i >= newIndex; i--) {
        element.childNodes[i].remove()
      }
    }
  }
}

export const prepare = (
  rootElement: HTMLElement | Element | string,
  oldAbstractTree?: NodeContent[] | string | null,
): PatchFunction => {
  const _rootElement = (
    typeof (rootElement) === 'string'
      ? (
        document.querySelector(rootElement)
        || document.body.appendChild(
          document.createElement('div')
        )
      )
      : rootElement
  )

  if (typeof (oldAbstractTree) === 'string') {
    try {
      oldAbstractTree = JSON.parse(oldAbstractTree) as NodeContent[]
    } catch (error) {
      oldAbstractTree = null
    }
  }
  if (!oldAbstractTree) {
    oldAbstractTree = childrenToNodes(_rootElement)
  }

  return (
    newAbstractTree: NodeContent[] | NodeContent | undefined,
  ): void => {
    newAbstractTree = arrayifyOrUndefined(newAbstractTree) as NodeContent[] | undefined
    updateElementTree(
      _rootElement,
      newAbstractTree,
      oldAbstractTree as NodeContent[],
    )
    oldAbstractTree = newAbstractTree
  }
}
