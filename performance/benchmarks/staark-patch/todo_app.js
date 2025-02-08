let state = null,
  update = null

window.benchmark = {
  setup: async function ({
    complexity,
    rootNode,
  }) {
    const { prepare, node } = window.staark

    const patch = prepare(rootNode)

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

    update = () => {
      patch(
        node('main', [
          node('h1', 'To-do List'),
          node('input', {
            type: 'text',
            input: updateInput,
            value: state.value,
          }),
          node('ul',
            state.todos.map((todo) =>
              node('li', {
                class: 'task-item ' + (todo.completed ? 'completed' : ''),
                'data-id': todo.id,
              }, [
                node('span', {
                  class: 'task-text',
                  style: {
                    'text-decoration': (
                      todo.completed
                        ? 'line-through'
                        : false
                    ),
                  },
                }, todo.text),
                node('button', {
                  class: 'toggle-button',
                  click: completeTodo,
                }, todo.completed ? 'Undo' : 'Complete'),
                node('button', {
                  class: 'delete-button',
                  click: deleteTodo,
                }, 'Delete'),
              ]),
            ),
          ),
          node('button', {
            click: addTodo,
          }, 'New!'),
        ]),
      )
    }

    update()
  },

  run: async function ({
    complexity,
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
