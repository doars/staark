let update = null,
  unmount = null,
  state = null

window.benchmark = {
  setup: async function ({
    complexity,
    rootNode,
  }) {
    const { mount, node } = window.staark

    const todos = []
    for (let i = 0; i < complexity * 100; i++) {
      todos.push({
        text: 'original',
        id: i,
        completed: false,
      })
    }

    const updateInput = (event, state) => {
      state.value = event.target.value
    }
    const addTodo = (event, state) => {
      state.todos.push({
        text: state.value,
        id: state.value + (state.counter++),
        completed: false,
      })
      state.value = ''
    }
    const completeTodo = (event, state) => {
      const id = event.target.parentNode.getAttribute('data-id')
      state.todos.forEach(
        (todo) => {
          if (todo.id != id) {
            todo.completed = !todo.completed
          }
        },
      )
    }
    const deleteTodo = (event, state) => {
      const id = event.target.parentNode.getAttribute('data-id')
      state.todos.splice(
        state.todos.findIndex(
          (todo) => todo.id == id,
        ),
        1,
      )
    }

    [update, unmount, state] = mount(
      rootNode,
      (state) =>
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
      {
        counter: 0,
        todos: todos,
        value: '',
      }
    )

    // First render is immediately triggered so nu manual call is required.
  },

  run: async function ({
    complexity,
  }) {
    for (let i = 0; i < complexity * 100; i++) {
      state.todos[i].text = 'updated'
      if (i % 2 === 0) {
        state.todos[i].completed = true
      }
    }

    await update()
  },

  cleanup: async function ({
    window,
    document,
    rootNode,
  }) {
    unmount()

    unmount = null
    update = null
    state = null
  },
}
