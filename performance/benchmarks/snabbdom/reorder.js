let ran = null,
  update = null

window.benchmark = {
  setup: async function ({
    complexity,
    rootNode,
  }) {
    const {
      h, init,
      classModule, datasetModule, eventListenersModule, propsModule, styleModule,
    } = window.snabbdom

    const patch = init([
      classModule,
      datasetModule,
      eventListenersModule,
      propsModule,
      styleModule,
    ])

    let vnode = rootNode

    update = () => {
      vnode = patch(
        vnode,
        h('div', [
          h('main', Array(10 * complexity).fill(null).map(
            (_, index) => {
              let number = index % 7
              if (ran) {
                number = 6 - number
              }
              switch (number) {
                case 0:
                  return h('p', 'p')
                case 1:
                  return h('h1', 'h1')
                case 2:
                  return h('h2', 'h2')
                case 3:
                  return h('h3', 'h3')
                case 4:
                  return h('h4', 'h4')
                case 5:
                  return h('h5', 'h5')
                case 6:
                  return h('h6', 'h6')
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
