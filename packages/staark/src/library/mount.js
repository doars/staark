import {
    arrayifyOrUndefined,
} from '@doars/staark-common/src/array.js'
import {
    cloneRecursive,
} from '@doars/staark-common/src/clone.js'
import {
    equalRecursive,
} from '@doars/staark-common/src/compare.js'
import {
    childrenToNodes,
} from '@doars/staark-common/src/element.js'
import {
    proxify,
} from './proxy.js'

/**
 * @typedef {import('@doars/staark-common/src/node.js').NodeContent} NodeContent
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributes} NodeAttributes
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributeListener} NodeAttributeListener
 * @typedef {import('@doars/staark-common/src/memo.js').MemoFunction} MemoFunction
 * @typedef {import('@doars/staark-common/src/memo.js').MemoAbstract} MemoAbstract
 * @typedef {import('@doars/staark-common/src/node.js').NodeAbstract} NodeAbstract
 */

/**
 * @typedef {Object} MemoData
 * @property {NodeContent[]} c Remembered abstract tree after rendering.
 * @property {any} m Remembered data to compare with.
 * @property {MemoFunction} r Render function to generated abstract tree.
 */

/**
 * @param {HTMLElement | Element | string} rootElement Root element to mount the view on.
 * @param {function(Object<string, any>): (NodeContent[] | NodeContent)} renderView Function to render the view using the state.
 * @param {Object<string, any> | string} [initialState]  Initial state to use.
 * @param {NodeContent[] | string | null} [oldAbstractTree] Old abstract tree to compare with.
 * @returns {undefined | [function(string[]): void, function(): unknown, Object<string, any>]} Returns a trigger function to update the view, a function to unmount the view and the state object.
 */
export const mount = (
  rootElement,
  renderView,
  initialState,
  oldAbstractTree,
) => {
  if (typeof (initialState) === 'string') {
    initialState = JSON.parse(initialState)
  }
  if (!initialState) {
    initialState = {}
  }
  let updatePromise = null
  /**
   * Triggers an update to the view by scheduling the updateAbstracts function if not already updating.
   */
  const triggerUpdate = () => {
    if (!updatePromise) {
      updatePromise = Promise.resolve()
        .then(updateAbstracts)
    }
    return updatePromise
  }
  const state = (
    Object.getPrototypeOf(initialState) === Proxy.prototype
      ? initialState
      : proxify(
        initialState,
        triggerUpdate,
      )
  )

  /**
   * @param {Element} element Element to update.
   * @param {NodeAttributes} newAttributes New attributes to set.
   * @param {NodeAttributes} [oldAttributes] Old attributes to compare with.
   */
  const updateAttributes = (
    element,
    newAttributes,
    oldAttributes,
  ) => {
    if (newAttributes) {
      for (const name in newAttributes) {
        let value = newAttributes[name]
        if (value) {
          const type = typeof (value)
          if (type === 'function') {
            const oldValue = oldAttributes?.[name]
            if (oldValue?.f === value) {
              newAttributes[name] = oldValue
            } else {
              if (oldValue) {
                element.removeEventListener(
                  name,
                  oldValue,
                )
              }

              const listener = newAttributes[name] =
                (event) => {
                  value(event, state)
                }
              element.addEventListener(
                name,
                listener,
              )
              listener.f = value
            }
          } else {
            if (name === 'class') {
              if (typeof (value) === 'object') {
                if (Array.isArray(value)) {
                  value = value.join(' ')
                } else {
                  let classNames = ''
                  for (const className in value) {
                    if (value[className]) {
                      classNames += ' ' + className
                    }
                  }
                  value = classNames
                }
              }
              element.className = value
            } else if (
              name === 'style'
              && typeof (value) === 'object'
            ) {
              for (let styleName in value) {
                let styleValue = value[styleName]
                if (styleName.includes('-', 1)) {
                  element.style.setProperty(
                    styleName,
                    styleValue,
                  )
                } else {
                  element.style[styleName] = styleValue
                }
              }

              if (
                oldAttributes
                && oldAttributes[name]
                && typeof (oldAttributes[name]) === 'object'
                && !Array.isArray(oldAttributes[name])
              ) {
                for (let styleName in oldAttributes[name]) {
                  if (!value[styleName]) {
                    if (styleName.includes('-', 1)) {
                      element.style.removeProperty(
                        styleName,
                      )
                    } else {
                      element.style[styleName] = null
                    }
                  }
                }
              }
            } else {
              if (value === true) {
                value = 'true'
              } else if (type !== 'string') {
                value = value.toString()
              }
              element.setAttribute(name, value)
              if (name === 'value') {
                element.value = value
              }
            }
          }
        }
      }
    }

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
              oldAttributes[name],
            )
          } else if (name === 'class') {
            element.className = ''
          } else if (name === 'style') {
            element.style.cssText = ''
          } else if (name === 'value') {
            element.value = ''
          } else {
            element.removeAttribute(name)
          }
        }
      }
    }
  }

  let oldMemoMap = new WeakMap()
  let newMemoMap = new WeakMap()

  /**
   * @param {Element} element Element to update.
   * @param {NodeContent[]} [newChildAbstracts] New children to set.
   * @param {NodeContent[]} [oldChildAbstracts] Old children to compare with.
   */
  const updateChildren = (
    element,
    newChildAbstracts,
    oldChildAbstracts,
    inSvg,
  ) => {
    let newIndex = 0
    let newCount = 0
    if (newChildAbstracts) {
      for (; newIndex < newChildAbstracts.length; newIndex++) {
        const newAbstract = newChildAbstracts[newIndex]

        if (newAbstract.r) {
          let match = oldMemoMap.get(
            newAbstract.r,
          )
          if (
            !match
            || !equalRecursive(match.m, newAbstract.m)
          ) {
            match = {
              c: arrayifyOrUndefined(
                newAbstract.r(
                  state,
                  newAbstract.m,
                ),
              ),
              m: newAbstract.m,
              r: newAbstract.r,
            }
          }

          newMemoMap.set(newAbstract.r, match)

          // Splice nodes into the tree and re-run the loop again.
          newChildAbstracts.splice(
            newIndex,
            1,
            // NOTE: Is a recursive clone required here? Yes as long as the old abstract tree is mutated.
            ...cloneRecursive(
              match.c,
            ),
          )
          // NOTE: Preferably we would skip re-rendering when the nodes were memoized, but because those nodes might have morphed we'll have to check. So we re-process the node again that was just inserted in. We could have the resolve memoization return whether it was re-rendered, but this also means the nodes are not allowed to be re-used when morphing the DOM and this needs to be prevented by marking them as such.
          newIndex--
          continue
        }

        let matched = false
        if (oldChildAbstracts) {
          for (let oldIndex = newIndex - newCount; oldIndex < oldChildAbstracts.length; oldIndex++) {
            const oldAbstract = oldChildAbstracts[oldIndex]
            if (
              (
                oldAbstract.t
                && newAbstract.t === oldAbstract.t
              )
              || (
                !oldAbstract.t
                && !newAbstract.t
              )
            ) {
              matched = true

              if (newIndex !== (oldIndex + newCount)) {
                element.insertBefore(
                  element.childNodes[oldIndex + newCount],
                  element.childNodes[newIndex],
                )
                oldChildAbstracts.splice(
                  newIndex - newCount,
                  0,
                  oldChildAbstracts.splice(
                    oldIndex,
                    1,
                  )[0],
                )
              }

              if (newAbstract.t) {
                updateAttributes(
                  element.childNodes[newIndex],
                  newAbstract.a,
                  oldAbstract.a,
                )
                updateChildren(
                  element.childNodes[newIndex],
                  newAbstract.c,
                  oldAbstract.c,
                  inSvg || newAbstract.t === 'SVG' || newAbstract.t === 'svg',
                )
              } else if (oldAbstract !== newAbstract) {
                element.childNodes[newIndex].textContent = newAbstract
              }
              break
            }
          }
        }

        if (!matched) {
          let newNode
          if (newAbstract.t) {
            const _inSvg = inSvg || newAbstract.t === 'SVG' || newAbstract.t === 'svg'
            if (_inSvg) {
              newNode = document.createElementNS(
                'http://www.w3.org/2000/svg',
                newAbstract.t
              )
            } else {
              newNode = document.createElement(
                newAbstract.t,
              )
            }
            updateAttributes(
              newNode,
              newAbstract.a,
              undefined,
              _inSvg,
            )
            updateChildren(
              newNode,
              newAbstract.c,
              undefined,
              _inSvg,
            )
          } else {
            newNode = document.createTextNode(
              newAbstract,
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
          document.createElement('div'),
        )
      )
      : rootElement
  )

  if (typeof (oldAbstractTree) === 'string') {
    try {
      oldAbstractTree = JSON.parse(oldAbstractTree)
    } catch (error) {
      oldAbstractTree = null
    }
  }
  if (!oldAbstractTree) {
    oldAbstractTree = childrenToNodes(_rootElement)
  }

  let active = true,
    updating = false
  /**
   * Updates the abstract tree representation of the view and applies changes to the DOM.
   */
  const updateAbstracts = () => {
    if (
      active
      && !updating
      && updatePromise
    ) {
      updating = true
      updatePromise = null

      let newAbstractTree = arrayifyOrUndefined(
        renderView(state),
      )
      updateChildren(
        _rootElement,
        newAbstractTree,
        oldAbstractTree,
      )
      oldAbstractTree = newAbstractTree
      oldMemoMap = newMemoMap
      newMemoMap = new WeakMap()

      updating = false
    }
  }
  triggerUpdate()
  updateAbstracts()

  return [
    triggerUpdate,
    () => {
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
