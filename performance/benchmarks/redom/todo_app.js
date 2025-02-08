let appInstance = null

window.benchmark = {
  setup: async function ({
    complexity,
    rootNode,
  }) {
    const {
      el,
      list,
    } = window.redom

    const todos = []
    for (let i = 0; i < complexity * 100; i++) {
      todos.push({
        text: 'original',
        id: i,
        completed: false,
      })
    }

    class TodoItem {
      constructor(app, todo) {
        this.app = app
        this.todo = todo

        this.el = el('li.task-item', {
          'data-id': todo.id,
        }, [
          this.span = el('span.task-text', todo.text),
          this.toggleButton = el(
            'button.toggle-button',
            todo.completed ? 'Undo' : 'Complete'
          ),
          this.deleteButton = el('button.delete-button', 'Delete')
        ])

        this.toggleButton.addEventListener('click', (event) => {
          event.preventDefault()
          this.app.completeTodo(todo)
        })
        this.deleteButton.addEventListener('click', (event) => {
          event.preventDefault()
          this.app.deleteTodo(todo)
        })
        this.update(todo)
      }

      update (todo) {
        this.todo = todo
        this.span.textContent = todo.text

        if (todo.completed) {
          this.el.classList.add('completed')
          this.span.style.textDecoration = 'line-through'
          this.toggleButton.textContent = 'Undo'
        } else {
          this.el.classList.remove('completed')
          this.span.style.textDecoration = 'none'
          this.toggleButton.textContent = 'Complete'
        }
      }
    }

    class App {
      constructor(state) {
        this.state = state

        this.el = el('main', [
          el('h1', 'To-do List'),
          this.input = el('input', {
            type: 'text',
            value: state.value,
          }),
          this.ul = el('ul'),
          this.newButton = el('button', 'New!')
        ])

        this.input.addEventListener('input', (event) =>
          this.updateInput(event)
        )
        this.newButton.addEventListener('click', (event) => {
          event.preventDefault()
          this.addTodo()
        })

        this.todoList = list('ul', TodoItem, this)
        this.el.replaceChild(this.todoList.el, this.ul)
        this.todoList.update(this.state.todos)
      }

      updateInput (e) {
        this.state.value = e.target.value
      }

      addTodo () {
        const newTodo = {
          text: this.state.value,
          id: this.state.value + this.state.counter,
          completed: false
        }
        this.state.todos.push(newTodo)
        this.state.counter++

        this.state.value = ''
        this.input.value = ''

        this.todoList.update(this.state.todos)
      }

      completeTodo (todo) {
        todo.completed = !todo.completed
        this.todoList.update(this.state.todos)
      }

      deleteTodo (todo) {
        this.state.todos = this.state.todos.filter(t => t.id !== todo.id)
        this.todoList.update(this.state.todos)
      }

      setTodos (todos) {
        this.state.todos = todos
        this.state.value = ''
        this.input.value = ''
        this.todoList.update(this.state.todos)
      }
    }

    appInstance = new App({
      counter: 0,
      todos: todos,
      value: '',
    })
    rootNode.appendChild(appInstance.el)
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
    if (appInstance) {
      appInstance.setTodos(todos)
    }
  },

  cleanup: async function ({
    window,
    document,
    rootNode,
  }) {
    if (
      appInstance
      && appInstance.el.parentNode
    ) {
      appInstance.el.parentNode.removeChild(appInstance.el)
    }
    appInstance = null
  },
}
