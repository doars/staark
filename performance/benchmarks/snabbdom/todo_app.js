let state = null,
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

    const todos = []
    for (let i = 0; i < complexity * 100; i++) {
      todos.push({
        text: 'original',
        id: i,
        completed: false,
      })
    }
    state = {
      todos: todos,
      counter: 0,
      value: ''
    }

    const updateInput = (event) => {
      state.value = event.target.value
    }
    const addTodo = () => {
      state.todos.push({
        text: state.value,
        id: state.value + (state.counter++),
        completed: false,
      })
      state.value = ''
      update()
    }
    const completeTodo = (event) => {
      const id = event.target.parentNode.getAttribute('data-id')
      state.todos.forEach(
        (todo) => {
          if (todo.id != id) {
            todo.completed = !todo.completed
          }
        },
      )
      update()
    }
    const deleteTodo = (event) => {
      const id = event.target.parentNode.getAttribute('data-id')
      state.todos.splice(
        state.todos.findIndex(
          (todo) => todo.id == id,
        ),
        1,
      )
      update()
    }

    let vnode = rootNode

    update = () => {
      const newVnode = h('div', [
        h('main', [
          h('h1', 'To-do List'),
          h('input', {
            props: {
              type: 'text',
              value: state.value,
            },
            on: {
              input: updateInput,
            },
          }),
          h('ul',
            state.todos.map((todo) =>
              h('li', {
                class: {
                  'task-item': true,
                  'completed': todo.completed,
                },
                attrs: {
                  'data-id': todo.id,
                },
              }, [
                h('span', {
                  class: {
                    'task-text': true,
                  },
                  style: {
                    textDecoration: todo.completed ? 'line-through' : 'none',
                  },
                }, todo.text),
                h('button', {
                  class: {
                    'toggle-button': true,
                  },
                  on: {
                    click: completeTodo,
                  },
                }, todo.completed ? 'Undo' : 'Complete'),
                h('button', {
                  class: {
                    'delete-button': true,
                  },
                  on: {
                    click: deleteTodo,
                  },
                }, 'Delete'),
              ]),
            ),
          ),
          h('button', {
            on: {
              click: addTodo,
            },
          }, 'New!'),
        ]),
      ])
      vnode = patch(vnode, newVnode)
    }

    update()
  },

  run: async function ({
    complexity,
    rootNode,
  }) {
    const todos = []
    for (let i = 0; i < complexity * 100; i++) {
      todos.push({
        text: 'updated',
        id: i,
        completed: i % 2 === 0,
      })
    }
    state.todos = todos

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
