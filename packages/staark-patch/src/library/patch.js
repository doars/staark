import {
    arrayifyOrUndefined,
} from '@doars/staark-common/src/array.js'
import {
    childrenToNodes,
} from '@doars/staark-common/src/element.js'

/**
 * @typedef {import('@doars/staark-common/src/node.js').NodeContent} NodeContent
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributes} NodeAttributes
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributeListener} NodeAttributeListener
 * @typedef {import('@doars/staark-common/src/node.js').NodeAbstract} NodeAbstract
 */

/**
 * Update the attributes of an element.
 *
 * @param {Element} element The element to update.
 * @param {NodeAttributes} newAttributes The new attributes to apply.
 * @param {NodeAttributes} [oldAttributes] The old attributes to cleanup.
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
          if (oldValue !== value) {
            if (oldValue) {
              element.removeEventListener(
                name,
                oldValue,
              )
            }

            element.addEventListener(
              name,
              value,
            )
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
            // Apply updated styles.
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

            // Remove old styles.
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
            // Ensure it is of type string.
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
            oldAttributes[name],
          )
        } else if (name === 'class') {
          element.className = ''
        } else if (name === 'style') {
          element.style.cssText = ''
        } else if (name === 'value') {
          element.value = ''
          // Don't dispatch the input change event, the rerendering should update everything: element.dispatchEvent(new Event('change'))
        } else {
          element.removeAttribute(name)
        }
      }
    }
  }
}

/**
 * Update the children of an element.
 *
 * @param {Element} element The element to update.
 * @param {NodeContent[]} [newChildAbstracts] The new children to apply.
 * @param {NodeContent[]} [oldChildAbstracts] The old children to cleanup.
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

      // Try to find the matching old abstract.
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
          let _inSvg = inSvg || newAbstract.t === 'SVG' || newAbstract.t === 'svg'
          if (_inSvg) {
            newNode = document.createElementNS(
              'http://www.w3.org/2000/svg',
              newAbstract.t,
            )
          } else {
            newNode = document.createElement(
              newAbstract.t,
            )
          }
          updateAttributes(
            newNode,
            newAbstract.a,
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

/**
 * Create a patch function that can be used to update the root element.
 *
 * @param {HTMLElement | Element | string} rootElement The root element to update.
 * @param {NodeContent[] | string | null} [oldAbstractTree] The old abstract tree to update.
 * @returns {function(NodeContent[] | NodeContent): unknown} The patch function to call to apply a new abstract tree to the element.
 */
export const prepare = (
  rootElement,
  oldAbstractTree,
) => {
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

  return (
    newAbstractTree,
  ) => {
    newAbstractTree = arrayifyOrUndefined(newAbstractTree)
    updateChildren(
      _rootElement,
      newAbstractTree,
      oldAbstractTree,
    )
    oldAbstractTree = newAbstractTree
  }
}
