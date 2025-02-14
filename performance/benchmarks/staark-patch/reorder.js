let ran = null,
  update = null

window.benchmark = {
  setup: async function ({
    complexity,
    rootNode,
  }) {
    const { prepare, node } = window.staarkPatch

    const patch = prepare(rootNode)

    update = () => {
      patch(
        node('main', Array(10 * complexity).fill(null).map(
          (_, index) => {
            let number = index % 7
            if (ran) {
              number = 6 - number
            }
            switch (number) {
              case 0:
                return node('p', 'p')
              case 1:
                return node('h1', 'h1')
              case 2:
                return node('h2', 'h2')
              case 3:
                return node('h3', 'h3')
              case 4:
                return node('h4', 'h4')
              case 5:
                return node('h5', 'h5')
              case 6:
                return node('h6', 'h6')
            }
          }
        )),
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
