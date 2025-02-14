let ran = null,
  update = null

window.benchmark = {
  setup: async function ({
    complexity,
    rootNode,
  }) {
    const { h, text, patch } = window.superfine

    update = () => {
      patch(
        rootNode,
        // NOTE: This library allows you to modify the root node and disconnects it from the DOM when the tag name of the root node is changed. Hence an additional virtual node for it is included.
        h('div', {}, [
          h('main', {}, Array(100 * complexity).fill(null).map(
            (_, index) => {
              let number = index % 7
              if (ran) {
                number = 6 - number
              }
              switch (number) {
                case 0:
                  return h('p', {}, text('p'))
                case 1:
                  return h('h1', {}, text('h1'))
                case 2:
                  return h('h2', {}, text('h2'))
                case 3:
                  return h('h3', {}, text('h3'))
                case 4:
                  return h('h4', {}, text('h4'))
                case 5:
                  return h('h5', {}, text('h5'))
                case 6:
                  return h('h6', {}, text('h6'))
              }
            }
          )),
        ]),
      )
    }

    ran = false
    update()
  },

  run: async function ({
  }) {
    ran = true
    update()
  },

  cleanup: async function ({
    rootNode,
  }) {
    update = null
    state = null

    for (let i = rootNode.childNodes.length - 1; i >= 0; i--) {
      rootNode.childNodes[i].remove()
    }
  },
}
