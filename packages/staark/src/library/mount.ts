import {
  arrayify,
} from '@doars/staark-common/src/array.js'
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
  TextAbstract,
} from '@doars/staark-common/src/text.js'
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

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g
const HYPHENATE = (
  part: string,
  offset: number,
) => (offset ? '-' : '') + part

export const mount = (
  rootElement: HTMLElement | Element | string,
  renderView: ViewFunction,
  initialState?: Record<string, any> | string,
  oldAbstractTree?: NodeContent[] | string,
): undefined | [GenericFunction<string[], void>, GenericFunctionUnknown, Record<string, any>] => {
  // Track amount of listeners running.
  let listenerCount = 0

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
            // Wrap the listener so we can prevent re-renders during handling.
            const listener = newAttributes[name] = (
              event: Event,
            ): void => {
              listenerCount++;
              try {
                (value as NodeAttributeListener)(event)
              } catch (error) {
                console.error('listener error', error)
              }
              listenerCount--
              updateAbstracts()
            }
            element.addEventListener(name, listener)
            continue
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
            } else if (name === 'style') {
              if (typeof (value) === 'object') {
                if (Array.isArray(value)) {
                  value = value.join(';')
                } else {
                  let styles: string = ''
                  for (let styleProperty in value) {
                    let styleValue: boolean | string | number | (boolean | string | number)[] = value[styleProperty]

                    // Convert to kebab case.
                    styleProperty = styleProperty
                      .replace(MATCH_CAPITALS, HYPHENATE)
                      .toLowerCase()

                    if (Array.isArray(styleValue)) {
                      styles += ';' + styleProperty + ':' + styleValue.join(' ')
                    } else if (styleValue) {
                      styles += ';' + styleProperty + ':' + styleValue
                    }
                  }
                  value = styles
                }
              }
            } else {
              // Ensure it is of type string.
              if (type === 'boolean') {
                if (!value) {
                  element.removeAttribute(name)
                  continue
                }
                value = 'true'
              } else if (type !== 'string') {
                value = value.toString()
              }

              if (
                name === 'value'
                && (element as HTMLInputElement).value !== value
              ) {
                // Update value separately as well.
                (element as HTMLInputElement).value = value as string
                // Don't dispatch a change event, the re-rendering should update everything: element.dispatchEvent(new Event('change'))
              } else if (name === 'checked') {
                (element as HTMLInputElement).checked = newAttributes[name] as boolean
                // Don't dispatch a change event, the re-rendering should update everything: element.dispatchEvent(new Event('change'))
              }
            }

            element.setAttribute(name, (value as string))
          }
        }
      }
    }

    // Cleanup old attributes.
    if (oldAttributes) {
      for (const name in oldAttributes) {
        if (typeof (oldAttributes[name]) === 'function') {
          element.removeEventListener(
            name,
            oldAttributes[name] as NodeAttributeListener,
          )
        } else if (
          !newAttributes
          || !(name in newAttributes)
          || !newAttributes[name]
        ) {
          if (name === 'value') {
            // Reset value separately.
            (element as HTMLInputElement).value = ''
            // Don't dispatch the input change event, the rerendering should update everything: element.dispatchEvent(new Event('change'))
          } else if (name === 'checked') {
            (element as HTMLInputElement).checked = false
          }
          element.removeAttribute(name)
        }
      }
    }
  }

  let oldMemoList: MemoData[] = []
  let newMemoList: MemoData[] = []
  const resolveMemoization = (
    memoAbstract: MemoAbstract,
  ): NodeContent[] => {
    // Try and get the data from memory.
    let match: MemoData | undefined = oldMemoList.find((oldMemo) => (
      oldMemo.r === memoAbstract.r
      && equalRecursive(oldMemo.m, memoAbstract.m)
    ))
    // If not found create it.
    if (!match) {
      match = {
        c: arrayify(
          memoAbstract.r(
            state,
            memoAbstract.m,
          )
        ),
        m: memoAbstract.m,
        r: memoAbstract.r,
      }
    }
    // Store it in the list.
    if (!newMemoList.includes(match)) {
      newMemoList.push(match)
    }
    // Return the resulting nodes.
    return structuredClone(
      match.c,
    )
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

        // Handle memoization.
        if ((newAbstract as MemoAbstract).r) {
          const memoAbstracts = resolveMemoization(
            (newAbstract as MemoAbstract)
          )
          // Splice nodes into the tree and re-run the loop again.
          newChildAbstracts.splice(
            newIndex,
            1,
            ...memoAbstracts,
          )
          // NOTE: Preferably we would skip re-rendering when the nodes were memoized, but because those nodes might have morphed we'll have to check. So we re-process the node again that was just inserted in.
          // We could have the resolve memoization return whether it was re-rendered, but this also means the nodes are not allowed to be re-used when morphing the DOM and this needs to be prevented by marking them as such.
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
              } else {
                element.childNodes[newIndex].textContent = (
                  typeof (newAbstract) === 'string'
                    ? newAbstract
                    : (newAbstract as TextAbstract).c
                )
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
            childElement = (
              typeof (newAbstract) === 'string'
                ? newAbstract
                : (newAbstract as TextAbstract).c
            )

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
                    childElement as string,
                  )
              } else {
                // Otherwise the position is always 'beforebegin'.
                (element.parentNode as Element)
                  .insertBefore(
                    document.createTextNode(childElement as string),
                    element.nextSibling,
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

  if (typeof (initialState) === 'string') {
    initialState = JSON.parse(initialState) as Record<string, any>
  }
  initialState ??= {}
  let proxyChanged = true
  const triggerUpdate = (
  ): void => {
    if (!proxyChanged) {
      proxyChanged = true
      Promise.resolve()
        .then(updateAbstracts)
    }
  }
  let state = (
    Object.getPrototypeOf(initialState) === Proxy.prototype
      ? initialState
      : proxify(
        initialState,
        triggerUpdate,
      )
  )

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

  let active: boolean = true,
    updating: boolean = false
  const updateAbstracts = (
  ): void => {
    if (
      active &&
      !updating &&
      // Only update if changes to the state have been made.
      proxyChanged &&
      // Don't update while handling listeners.
      listenerCount <= 0
    ) {
      updating = true
      proxyChanged = false

      let newAbstractTree = arrayify(
        renderView(state),
      )
      updateElementTree(
        _rootElement,
        newAbstractTree,
        oldAbstractTree as NodeContent[],
      )
      // Store tree for next update
      oldAbstractTree = newAbstractTree
      oldMemoList = newMemoList
      newMemoList = []

      updating = false
      if (proxyChanged) {
        throw new Error('update during render')
      }
    }
  }
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
