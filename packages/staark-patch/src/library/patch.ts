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

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g
const HYPHENATE = (
  part: string,
  offset: number,
) => (offset ? '-' : '') + part

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
              let styleValue = (value as Record<string, boolean | string | null | undefined | number | (boolean | string | number)[]>)[styleName]

              // Convert to kebab case.
              styleName = styleName
                .replace(MATCH_CAPITALS, HYPHENATE)
                .toLowerCase()

              if (Array.isArray(styleValue)) {
                styleValue = styleValue.join(' ')
              }

              (element as HTMLElement).style.setProperty(
                styleName,
                styleValue as string,
              )
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
                  styleName = styleName
                    .replace(MATCH_CAPITALS, HYPHENATE)
                    .toLowerCase();

                  (element as HTMLElement).style.removeProperty(
                    styleName,
                  )
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

            // Setting attribute will automatically update the elements checked and value state.
            // if (
            //   name === 'value'
            //   && (element as HTMLInputElement).value !== value
            // ) {
            // (element as HTMLInputElement).value = value as string
            // Don't dispatch a change event, the re-rendering should update everything: element.dispatchEvent(new Event('change'))
            // } else if (name === 'checked') {
            //   (element as HTMLInputElement).checked = !!value
            // Don't dispatch a change event, the re-rendering should update everything: element.dispatchEvent(new Event('change'))
            // }

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
        } else {
          // Setting attribute will automatically update the elements checked and value state.
          // if (name === 'value') {
          // (element as HTMLInputElement).value = ''
          // Don't dispatch the input change event, the rerendering should update everything: element.dispatchEvent(new Event('change'))
          // } else if (name === 'checked') {
          //   (element as HTMLInputElement).checked = false
          // }
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
  elementAbstract?: NodeContent,
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
          const oldAbstract = oldChildAbstracts[oldIndex];
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
              // Move node in abstract tree.
              oldChildAbstracts.splice(
                newIndex - newCount,
                0,
                ...oldChildAbstracts.splice(
                  oldIndex,
                  1,
                )
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
                oldAbstract,
              )
            } else if (oldAbstract !== newAbstract) {
              element.childNodes[newIndex].textContent = newAbstract as string
            }
            break
          }
        }
      }

      if (!matched) {
        let childElement: Element | string
        if ((newAbstract as NodeAbstract).t) {
          childElement = document.createElement(
            (newAbstract as NodeAbstract).t
          )

          if ((newAbstract as NodeAbstract).a) {
            updateAttributes(
              childElement,
              (newAbstract as NodeAbstract).a,
            )
          }
          if ((newAbstract as NodeAbstract).c) {
            updateElementTree(
              childElement,
              (newAbstract as NodeAbstract).c,
            )
          }

          const insertAdjacentElement = (
            element: Node,
            elementAbstract?: NodeContent | null,
            position?: InsertPosition,
          ) => {
            if (
              position &&
              (
                !elementAbstract
                || (elementAbstract as NodeAbstract).t
              )
            ) {
              (element as Element)
                .insertAdjacentElement(
                  position,
                  childElement as Element,
                )
            } else {
              // Otherwise the position is always 'beforebegin'.
              (element.parentNode as Element)
                .insertBefore(
                  childElement as Element,
                  element,
                )
            }
          }
          if (newIndex === 0) {
            insertAdjacentElement(
              element,
              elementAbstract,
              'afterbegin',
            )
          } else if ((oldChildAbstracts?.length ?? 0) + newCount > newIndex) {
            insertAdjacentElement(
              (element.childNodes[newIndex] as Node),
              // (oldChildAbstracts as NodeContent[])[newIndex + newCount],
              // 'beforebegin',
            )
          } else {
            insertAdjacentElement(
              element,
              elementAbstract,
              'beforeend',
            )
          }
        } else {
          const insertAdjacentText = (
            element: Node,
            elementAbstract?: NodeContent | null,
            position?: InsertPosition,
          ) => {
            if (
              position &&
              (
                !elementAbstract
                || (elementAbstract as NodeAbstract).t
              )
            ) {
              (element as Element)
                .insertAdjacentText(
                  position,
                  newAbstract as string,
                )
            } else {
              // Otherwise the position is always 'beforebegin'.
              (element.parentNode as Element)
                .insertBefore(
                  document.createTextNode(newAbstract as string),
                  element,
                )
            }
          }
          if (newIndex === 0) {
            insertAdjacentText(
              element,
              elementAbstract,
              'afterbegin',
            )
          } else if ((oldChildAbstracts?.length ?? 0) + newCount > newIndex) {
            insertAdjacentText(
              element.childNodes[newIndex] as Node,
              // (oldChildAbstracts as NodeContent[])[newIndex + newCount],
              // 'beforebegin',
            )
          } else {
            insertAdjacentText(
              element,
              elementAbstract,
              'beforeend',
            )
          }
        }
        newCount++
      }
    }
  }

  // Remove old elements.
  const elementLength = (oldChildAbstracts?.length ?? 0) + newCount
  if (elementLength >= newIndex) {
    for (let i = elementLength - 1; i >= newIndex; i--) {
      element.childNodes[i].remove()
    }
  }
}

export const prepare = (
  rootElement: HTMLElement | Element | string,
  oldAbstractTree?: NodeContent[] | string,
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
      oldAbstractTree = undefined
    }
  }
  oldAbstractTree ??= childrenToNodes(_rootElement)

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
