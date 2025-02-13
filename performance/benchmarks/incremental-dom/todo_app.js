let state = null,
  update = null

window.benchmark = {
  setup: async ({
    complexity,
    rootNode,
  }) => {
    const { patch, elementOpen, elementClose, text } = window.incrementalDOM

    const todos = []
    for (let i = 0; i < complexity * 100; i++) {
      todos.push({
        text: 'original',
        id: i,
        completed: false,
      })
    }
    state = {
      todos,
      counter: 0,
      value: '',
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

    const render = () => {
      patch(rootNode, () => {
        elementOpen('div')
        elementOpen('main')

        elementOpen('h1')
        text('To-do List')
        elementClose('h1')

        elementOpen('input', '', [
          'type', 'text',
          'value', state.value,
          'oninput', updateInput,
        ])
        elementClose('input')

        elementOpen('ul')
        for (const todo of state.todos) {
          elementOpen('li', '', null, 'data-id', todo.id, 'class', todo.completed ? 'task-item completed' : 'task-item')

          // elementOpen('span', '', ['class', 'task-text', 'style', todo.completed ? 'text-decoration: line-through' : 'text-decoration: none'])
          elementOpen('span', '', null, 'class', 'task-text', 'style', todo.completed ? 'text-decoration: line-through;' : 'text-decoration: none;');
          text(todo.text)
          elementClose('span')

          elementOpen('button', '', ['class', 'toggle-button', 'onclick', () => completeTodo])
          text(todo.completed ? 'Undo' : 'Complete')
          elementClose('button')

          elementOpen('button', '', ['class', 'delete-button', 'onclick', () => deleteTodo])
          text('Delete')
          elementClose('button')

          elementClose('li')
        }
        elementClose('ul')

        elementOpen('button', '', ['onclick', addTodo])
        text('New!')
        elementClose('button')

        elementClose('main')
        elementClose('div')
      })
    }

    update = render
    render()
  },

  run: async ({
    complexity,
  }) => {
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

  cleanup: async ({
    rootNode
  }) => {
    update = null
    state = null

    while (rootNode.firstChild) {
      rootNode.removeChild(rootNode.firstChild)
    }
  },
}
