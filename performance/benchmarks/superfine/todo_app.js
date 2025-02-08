let state = null,
  update = null

window.benchmark = {
  setup: async function ({
    complexity,
    rootNode,
  }) {
    const { h, text, patch } = window.superfine

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
        rootNode,
        // NOTE: This library allows you to modify the root node and disconnects it from the DOM when the tag name of the root node is changed. Hence an additional virtual node for it is included.
        h('div', {}, [
          h('main', {}, [
            h('h1', {}, text('To-do List')),
            h('input', {
              type: 'text',
              oninput: updateInput,
              value: state.value,
            }),
            h('ul', {},
              state.todos.map((todo) =>
                h('li', {
                  class: 'task-item ' + (todo.completed ? 'completed' : ''),
                  'data-id': todo.id,
                }, [
                  h('span', {
                    class: 'task-text',
                    style: {
                      'text-decoration': (
                        todo.completed
                          ? 'line-through'
                          : false
                      ),
                    },
                  }, text(todo.text)),
                  h('button', {
                    class: 'toggle-button',
                    onclick: completeTodo,
                  }, text(todo.completed ? 'Undo' : 'Complete')),
                  h('button', {
                    class: 'delete-button',
                    onclick: deleteTodo,
                  }, text('Delete')),
                ]),
              ),
            ),
            h('button', {
              onclick: addTodo,
            }, text('New!')),
          ]),
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
