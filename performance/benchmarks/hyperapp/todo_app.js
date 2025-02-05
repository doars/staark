const ITERATIONS = 1e4

let dispatch = null,
  setTodos = null

window.benchmark = {
  setup: async function ({
    rootNode,
  }) {
    const { app, h, text } = window.hyperapp

    const todos = []
    for (let i = 0; i < ITERATIONS; i++) {
      todos.push({
        text: 'original',
        id: i,
        completed: false,
      })
    }

    const updateInput = (state, event) => ({
      ...state,
      value: event.target.value
    })

    const addTodo = (state) => ({
      ...state,
      todos: [...state.todos, {
        text: state.value,
        id: state.value + (state.counter++),
        completed: false,
      }],
      value: '',
      counter: state.counter + 1
    })
    const completeTodo = (state, event) => {
      const id = event.target.parentNode.getAttribute('data-id')
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id != id ? { ...todo, completed: !todo.completed } : todo
        )
      }
    }
    const deleteTodo = (state, event) => {
      const id = event.target.parentNode.getAttribute('data-id')
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id == id)
      }
    }
    window.setTodos = (state, event) => ({
      ...state,
      value: '',
      todos: event.todos,
    })

    window.dispatch = app({
      node: rootNode,
      view: (state) =>
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
                      'text-decoration': todo.completed ? 'line-through' : 'none',
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
      init: {
        counter: 0,
        todos: todos,
        value: '',
      },
    })

    await new Promise(requestAnimationFrame)
  },

  run: async function ({
    rootNode,
  }) {
    const todos = []
    for (let i = 0; i < ITERATIONS; i++) {
      todos.push({
        text: 'updated',
        id: i,
        completed: i % 2 === 0,
      })
    }
    window.dispatch(window.setTodos, {
      todos: todos,
    })

    await new Promise(requestAnimationFrame)
  },

  cleanup: async function ({
    rootNode,
  }) {
    window.dispatch = null
    window.setTodos = null

    for (let i = rootNode.childNodes.length - 1; i >= 0; i--) {
      rootNode.childNodes[i].remove()
    }
  },
}
