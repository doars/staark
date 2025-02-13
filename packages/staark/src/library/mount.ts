import {
  arrayifyOrUndefined,
} from '@doars/staark-common/src/array.js'
import {
  cloneRecursive
} from '@doars/staark-common/src/clone.js'
import {
  equalRecursive,
} from '@doars/staark-common/src/compare.js'
import {
  childrenToNodes,
} from '@doars/staark-common/src/element.js'
import {
  MemoAbstract,
  MemoFunction,
} from '@doars/staark-common/src/memo.js'
import {
  NodeAbstract,
  NodeAttributes,
  NodeAttributeListener,
  NodeContent,
} from '@doars/staark-common/src/node.js'
import {
  proxify,
} from '../utilities/proxy.js'

export type GenericFunction<DataType, ReturnType> = (
  argument: DataType
) => ReturnType

export type GenericFunctionUnknown = (
) => unknown

type MemoData = {
  c: NodeContent[],
  m: any,
  r: MemoFunction,
}

export type ViewFunction = (
  state: Record<string, any>,
) => NodeContent[] | NodeContent

export const mount = (
  rootElement: HTMLElement | Element | string,
  renderView: ViewFunction,
  initialState?: Record<string, any> | string,
  oldAbstractTree?: NodeContent[] | string,
): undefined | [GenericFunction<string[], void>, GenericFunctionUnknown, Record<string, any>] => {
  if (typeof (initialState) === 'string') {
    initialState = JSON.parse(initialState) as Record<string, any>
  }
  if (!initialState) {
    initialState = {}
  }
  let updatePromise: Promise<void> | null = null
  const triggerUpdate = (
  ): Promise<void> | null => {
    if (!updatePromise) {
      updatePromise = Promise.resolve()
        .then(updateAbstracts)
    }
    return updatePromise
  }
  let state = (
    Object.getPrototypeOf(initialState) === Proxy.prototype
      ? initialState
      : proxify(
        initialState,
        triggerUpdate,
      )
  )

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
            // Wrap listeners so comparisons can be done between updates.
            const oldValue = oldAttributes?.[name] as NodeAttributeListener | undefined
            if (oldValue?.f !== (value as NodeAttributeListener)) {
              if (oldValue) {
                element.removeEventListener(
                  name,
                  oldValue as NodeAttributeListener,
                )
              }

              const listener: NodeAttributeListener = newAttributes[name] = (
                (event: Event) => {
                  (value as NodeAttributeListener)(event, state)
                }
              ) as NodeAttributeListener
              listener.f = (value as NodeAttributeListener)

              element.addEventListener(
                name,
                listener,
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
        const value = oldAttributes[name]
        if (
          !newAttributes
          || !newAttributes[name]
        ) {
          if (typeof (value) === 'function') {
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
            // Don't dispatch a change event, the re-rendering should update everything: element.dispatchEvent(new Event('change'))
            // }

            element.removeAttribute(name)
          }
        }
      }
    }
  }

  let oldMemoMap: WeakMap<MemoFunction, MemoData> = new WeakMap()
  let newMemoMap: WeakMap<MemoFunction, MemoData> = new WeakMap()
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

        // Handle memoization.
        if ((newAbstract as MemoAbstract).r) {
          let match: MemoData | undefined = oldMemoMap.get(
            (newAbstract as MemoAbstract).r,
          )
          if (
            !match
            || !equalRecursive(match.m, (newAbstract as MemoAbstract).m)
          ) {
            match = {
              c: arrayifyOrUndefined(
                (newAbstract as MemoAbstract).r(
                  state,
                  (newAbstract as MemoAbstract).m,
                )
              ),
              m: (newAbstract as MemoAbstract).m,
              r: (newAbstract as MemoAbstract).r,
            } as MemoData
          }

          newMemoMap.set((newAbstract as MemoAbstract).r, match)

          // Splice nodes into the tree and re-run the loop again.
          newChildAbstracts.splice(
            newIndex,
            1,
            // NOTE: Is a recursive clone required here?
            ...cloneRecursive(
              match.c,
            ),
          )
          // NOTE: Preferably we would skip re-rendering when the nodes were memoized, but because those nodes might have morphed we'll have to check. So we re-process the node again that was just inserted in. We could have the resolve memoization return whether it was re-rendered, but this also means the nodes are not allowed to be re-used when morphing the DOM and this needs to be prevented by marking them as such.
          newIndex--
          continue
        }

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
                // Move node in abstract tree.
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
                  oldAbstract,
                )
              } else {
                if (
                  (oldAbstract as string) !== (newAbstract as string)
                ) {
                  element.childNodes[newIndex].textContent = (newAbstract as string)
                }
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
                position
                && (
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
            } else if (
              oldChildAbstracts
              && oldChildAbstracts.length + newCount > newIndex
            ) {
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
                position
                && (
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
            } else if (
              oldChildAbstracts
              && oldChildAbstracts.length + newCount > newIndex
            ) {
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

    if (oldChildAbstracts) {
      const elementLength = oldChildAbstracts.length + newCount
      if (elementLength >= newIndex) {
        for (let i = elementLength - 1; i >= newIndex; i--) {
          element.childNodes[i].remove()
        }
      }
    }
  }

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
  if (!oldAbstractTree) {
    oldAbstractTree = childrenToNodes(_rootElement)
  }

  let active: boolean = true,
    updating: boolean = false
  const updateAbstracts = (
  ): void => {
    if (
      active
      && !updating
      // Only update if changes to the state have been made.
      && updatePromise
    ) {
      updating = true
      updatePromise = null

      let newAbstractTree = arrayifyOrUndefined(
        renderView(state),
      )
      updateElementTree(
        _rootElement,
        newAbstractTree,
        oldAbstractTree as NodeContent[],
      )
      // Store tree for next update.
      oldAbstractTree = newAbstractTree
      oldMemoMap = newMemoMap
      newMemoMap = new WeakMap()

      updating = false
    }
  }
  // Trigger update first so the promise that is checked gets set.
  triggerUpdate()
  // Now perform initial update.
  updateAbstracts()

  return [
    triggerUpdate,
    (): void => {
      if (active) {
        active = false

        for (let i = _rootElement.childNodes.length - 1; i >= 0; i--) {
          _rootElement.childNodes[i].remove()
        }
      }
    },
    state,
  ]
}
