import {
  arrayify,
} from '@doars/staark-common/src/array.js'
import {
  cloneRecursive,
} from '@doars/staark-common/src/clone.js'
import {
  equalRecursive,
} from '@doars/staark-common/src/compare.js'
import {
  GenericFunction,
  GenericFunctionUnknown,
  GenericObject,
  GenericObjectAny,
} from '@doars/staark-common/src/generics.js'
import {
  proxify,
} from '../utilities/proxy.js'

import {
  MemoAbstract,
  MemoFunction,
} from './memo.js'
import {
  NodeAbstract,
  NodeAttributes,
  NodeAttributeListener,
  NodeContent,
} from './node.js'
import {
  TextAbstract,
} from './text.js'

type MemoData = {
  c: NodeContent[],
  m: any,
  r: MemoFunction,
}

export type ViewFunction = (
  state: GenericObject<any>,
) => NodeContent | NodeContent[]

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g
const HYPHENATE = (
  part: string,
  offset: number,
) => (offset ? '-' : '') + part

export const mount = (
  rootNode: Element | string,
  renderView: ViewFunction,
  initialState?: GenericObject<any>,
): undefined | [GenericFunction<string[], void>, GenericFunctionUnknown, GenericObjectAny] => {
  if (!initialState) {
    initialState = {}
  }

  let active: boolean = true,
    updating: boolean = false
  let _rootNode: Element | null
  const unmount = (
  ): void => {
    if (active) {
      active = false
      if (_rootNode) {
        for (let i = _rootNode.childNodes.length - 1; i >= 0; i--) {
          _rootNode.childNodes[i].remove()
        }
      }
    }
  }

  _rootNode = typeof (rootNode) === 'string'
    ? document.querySelector(rootNode)
    : rootNode
  if (!_rootNode) {
    throw new Error('No mount')
  }
  unmount()
  active = true

  if (!_rootNode) {
    _rootNode = document.createElement('div')
    document.body.appendChild(_rootNode)
  }

  // Track amount of listeners running.
  let listenerCount = 0

  const updateAttributes = (
    element: Element,
    newAttributes: NodeAttributes | null = null,
    oldAttributes: NodeAttributes | null = null,
  ): void => {
    if (newAttributes) {
      for (const name in newAttributes) {
        let value = newAttributes[name]
        if (
          value !== null
          && value !== undefined
        ) {
          const type = typeof (value)
          if (type === 'function') {
            // Wrap the listener so we can prevent re-renders during handling.
            const listener = newAttributes[name] = (
              event: Event,
            ): void => {
              listenerCount++;
              (value as NodeAttributeListener)(event)
              listenerCount--
              updateAbstracts()
            }
            element.addEventListener(name, listener)
            continue
          } else {
            // Ensure it is of type string.
            if (type === 'boolean') {
              value = value ? 'true' : 'false'
            } else if (type !== 'string') {
              value = value.toString()
            }

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
                    let styleValue: string | number | (string | number)[] = value[styleProperty]

                    // Convert to kebab case.
                    styleProperty = styleProperty
                      .replace(MATCH_CAPITALS, HYPHENATE)
                      .toLowerCase()

                    if (Array.isArray(styleValue)) {
                      styles += ';' + styleProperty + ':' + styleValue.join(' ')
                    } else if (value) {
                      styles += ';' + styleProperty + ':' + value
                    }
                  }
                  value = styles
                }
              }
            } else if (
              name === 'value' &&
              (element as HTMLInputElement).value !== value
            ) {
              // Update value separately as well.
              (element as HTMLInputElement).value = value as string
              // Don't dispatch a change event, the re-rendering should update everything: element.dispatchEvent(new Event('change'))
            } else if (name === 'checked') {
              (element as HTMLInputElement).checked = newAttributes[name] as boolean
              // Don't dispatch a change event, the re-rendering should update everything: element.dispatchEvent(new Event('change'))
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
          !newAttributes ||
          !(name in newAttributes)
          || (newAttributes[name] === null)
          || (newAttributes[name] === undefined)
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
    return cloneRecursive(
      match.c,
    )
  }

  const updateElementTree = (
    element: Element,
    newChildAbstracts: NodeContent[] | null = null,
    oldChildAbstracts: NodeContent[] | null = null,
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
          // NOTE: Preferably we would skip re-rendering when the nodes were memoized, but because those nodes might have morphed we'll have to check. So we re-process the node again that as just inserted in.
          newIndex--
          continue
        }

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

              if (newIndex !== oldIndex) {
                // Move node in dom.
                element.insertBefore(
                  element.childNodes[oldIndex + newCount],
                  element.childNodes[newIndex],
                )
                // Move node in abstract tree.
                oldAbstractTree.splice(
                  newIndex - newCount,
                  0,
                  ...oldAbstractTree.splice(
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
          if ((newAbstract as NodeAbstract).t) {
            const childElement = document.createElement(
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

            if (element.childNodes.length > newIndex) {
              (element.childNodes[newIndex] as Element)
                .insertAdjacentElement(
                  'afterend',
                  childElement,
                )
            } else {
              element.insertAdjacentElement(
                'beforeend',
                childElement,
              )
            }
            newCount++
          } else {
            const childElement = (
              typeof (newAbstract) === 'string'
                ? newAbstract
                : (newAbstract as TextAbstract).c
            )

            if (element.childNodes.length > newIndex) {
              (element.childNodes[newIndex] as Element)
                .insertAdjacentText(
                  'afterend',
                  childElement,
                )
            } else {
              element.insertAdjacentText(
                'beforeend',
                childElement,
              )
            }
            newCount++
          }
        }
      }
    }

    // Remove old elements.
    if (element.childNodes.length >= newIndex) {
      for (let i = element.childNodes.length - 1; i >= newIndex; i--) {
        element.childNodes[i].remove()
      }
    }
  }

  let proxyChanged = true
  let state = (
    Object.getPrototypeOf(initialState) === Proxy.prototype
      ? initialState
      : proxify(
        initialState,
        (): void => {
          proxyChanged = true
          requestAnimationFrame(
            updateAbstracts,
          )
        },
      )
  )

  let oldAbstractTree: NodeContent[] = []
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
        _rootNode,
        newAbstractTree,
        oldAbstractTree,
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
    (): void => {
      proxyChanged = true
      requestAnimationFrame(
        updateAbstracts,
      )
    },
    unmount,
    state,
  ]
}
