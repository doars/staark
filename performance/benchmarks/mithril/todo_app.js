const ITERATIONS = 1e4

let state = null

window.benchmark = {
  setup: async function ({
    rootNode,
  }) {
    const { m, mount } = window.mithril

    const todos = []
    for (let i = 0; i < ITERATIONS; i++) {
      todos.push({
        text: 'original',
        id: i,
        completed: false,
      })
    }

    state = {
      counter: 0,
      todos: todos,
      value: '',
    }

    mount(rootNode, {
      view: () => m('main', [
        m('h1', 'To-do List'),
        m('input', {
          type: 'text',
          value: state.value,
          oninput: (event) => {
            state.value = event.target.value
          },
        }),
        m('ul', state.todos.map((todo) =>
          m('li', {
            class: 'task-item ' + (todo.completed ? 'completed' : ''),
            'data-id': todo.id,
          }, [
            m('span', {
              class: 'task-text',
              style: {
                'text-decoration': todo.completed ? 'line-through' : 'none',
              },
            }, todo.text),
            m('button', {
              class: 'toggle-button',
              onclick: (event) => {
                const id = event.target.parentNode.getAttribute('data-id')
                state.todos = state.todos.map((todo) =>
                  todo.id != id ? Object.assign({}, todo, { completed: !todo.completed }) : todo
                )
              },
            }, todo.completed ? 'Undo' : 'Complete'),
            m('button', {
              class: 'delete-button',
              onclick: (event) => {
                const id = event.target.parentNode.getAttribute('data-id')
                state.todos = state.todos.filter((todo) => todo.id == id)
              },
            }, 'Delete'),
          ]),
        )),
        m('button', {
          onclick: () => {
            // addTodo: append a new todo with the current value
            state.todos = state.todos.concat({
              text: state.value,
              id: state.value + (state.counter++),
              completed: false,
            })
            state.value = ''
            state.counter = state.counter + 1
          },
        }, 'New!'),
      ]),
    })

    return new Promise(requestAnimationFrame)
  },

  run: async function ({
    rootNode,
  }) {
    const { redraw } = window.mithril

    const todos = []
    for (let i = 0; i < ITERATIONS; i++) {
      todos.push({
        text: 'updated',
        id: i,
        completed: i % 2 === 0,
      })
    }
    state.todos = todos

    redraw()

    return new Promise(requestAnimationFrame)
  },

  cleanup: async function ({
    rootNode,
  }) {
    const { mount } = window.mithril

    mount(rootNode, null)

    state = null

    for (let i = rootNode.childNodes.length - 1; i >= 0; i--) {
      rootNode.childNodes[i].remove()
    }
  },
}
