import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'
import { Window } from 'happy-dom'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.Element = window.Element

import {
  mount,
  node,
} from '../../src/index.js'

describe('Examples', () => {
  it('should handle BMI calculator', async () => {
    const app = document.createElement('div')
    const calculateBMI = (
      state,
    ) => {
      const weight = parseFloat(state.weight)
      const height = parseFloat(state.height) / 100
      if (
        weight
        && height
      ) {
        state.bmi = (weight / (height * height)).toFixed(2)
      }
    }

    const [_update, _unmount, state] = mount(
      app,
      (state) =>
        node('div', {
          style: {
            maxWidth: '256px',
          }
        }, [
          node('p', 'BMI calculator'),

          node('input', {
            type: 'number',
            placeholder: 'Weight (kg)',
            value: state.weight,
            input: (
              event,
              state,
            ) => {
              state.weight = event.target.value
              calculateBMI(state)
            },
            style: {
              marginBottom: '8px',
              padding: '4px',
              width: '100%',
            },
          }),

          node('input', {
            type: 'number',
            placeholder: 'Height (cm)',
            value: state.height,
            input: (
              event,
              state,
            ) => {
              state.height = event.target.value
              calculateBMI(state)
            },
            style: {
              marginBottom: '8px',
              padding: '4px',
              width: '100%',
            },
          }),

          node('div', {
            style: {
              marginTop: '8px',
            },
          }, 'BMI: ' + state.bmi),
        ]),
      {
        weight: '',
        height: '',
        bmi: 0,
      },
    )

    assert.strictEqual(state.bmi, 0)

    const weightInput = app.querySelector('input[placeholder="Weight (kg)"]')
    const heightInput = app.querySelector('input[placeholder="Height (cm)"]')

    weightInput.value = '70'
    weightInput.dispatchEvent(new window.Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    heightInput.value = '170'
    heightInput.dispatchEvent(new window.Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.bmi, '24.22')
    assert.ok(app.textContent.includes('BMI: 24.22'))
  })

  it('should handle calculator', async () => {
    const app = document.createElement('div')
    const appendNumber = (
      state,
      number,
    ) => {
      if (state.display === '0' || state.result) {
        state.display = number
        state.result = null
      } else {
        state.display += number
      }
    }

    const clearDisplay = (
      state,
    ) => {
      state.display = '0'
      state.firstOperand = null
      state.operator = null
      state.result = null
    }

    const setOperator = (
      state,
      operator,
    ) => {
      if (state.firstOperand === null) {
        state.firstOperand = parseFloat(state.display)
      } else if (state.operator) {
        calculateResult(state)
      }
      state.operator = operator
      state.display = '0'
    }

    const calculateResult = (
      state,
    ) => {
      if (
        state.operator
        && state.firstOperand !== null
      ) {
        const secondOperand = parseFloat(state.display)
        switch (state.operator) {
          case '+':
            state.result = state.firstOperand + secondOperand
            break

          case '-':
            state.result = state.firstOperand - secondOperand
            break

          case '*':
            state.result = state.firstOperand * secondOperand
            break

          case '/':
            state.result = state.firstOperand / secondOperand
            break
        }
        state.display = state.result.toString()
        state.firstOperand = null
        state.operator = null
      }
    }

    const [_update, _unmount, state] = mount(
      app,
      (state) =>
        node('div', {
          style: {
            maxWidth: '256px',
          },
        }, [
          node('div', {
            style: {
              marginBottom: '8px',
              fontSize: '24px',
              border: '1px solid black',
              padding: '8px',
              textAlign: 'right',
            }
          }, state.display),

          node('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            },
          }, [
            node('button', {
              click: (event, state) => appendNumber(state, '7'),
            }, '7'),
            node('button', {
              click: (event, state) => appendNumber(state, '8'),
            }, '8'),
            node('button', {
              click: (event, state) => appendNumber(state, '9'),
            }, '9'),
            node('button', {
              click: (event, state) => setOperator(state, '/'),
            }, '/'),

            node('button', {
              click: (event, state) => appendNumber(state, '4'),
            }, '4'),
            node('button', {
              click: (event, state) => appendNumber(state, '5'),
            }, '5'),
            node('button', {
              click: (event, state) => appendNumber(state, '6'),
            }, '6'),
            node('button', {
              click: (event, state) => setOperator(state, '*'),
            }, '*'),

            node('button', {
              click: (event, state) => appendNumber(state, '1'),
            }, '1'),
            node('button', {
              click: (event, state) => appendNumber(state, '2'),
            }, '2'),
            node('button', {
              click: (event, state) => appendNumber(state, '3'),
            }, '3'),
            node('button', {
              click: (event, state) => setOperator(state, '-'),
            }, '-'),

            node('button', {
              click: (event, state) => clearDisplay(state),
            }, 'C'),
            node('button', {
              click: (event, state) => appendNumber(state, '0'),
            }, '0'),
            node('button', {
              click: (event, state) => calculateResult(state),
            }, '='),
            node('button', {
              click: (event, state) => setOperator(state, '+'),
            }, '+'),
          ]),
        ]),
      {
        display: '0',
        firstOperand: null,
        operator: null,
        result: null,
      },
    )

    assert.strictEqual(state.display, '0')

    const buttons = app.querySelectorAll('button')
    const sevenButton = Array.from(buttons).find(b => b.textContent === '7')
    const plusButton = Array.from(buttons).find(b => b.textContent === '+')
    const threeButton = Array.from(buttons).find(b => b.textContent === '3')
    const equalsButton = Array.from(buttons).find(b => b.textContent === '=')

    sevenButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.strictEqual(state.display, '7')

    plusButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.strictEqual(state.display, '0')

    threeButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.strictEqual(state.display, '3')

    equalsButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.strictEqual(state.display, '10')
  })

  it('should handle stopwatch', async () => {
    const app = document.createElement('div')
    const stopStopwatch = (
      state,
    ) => {
      clearInterval(state.timerInterval)
      state.timerInterval = null
    }

    const [_update, _unmount, state] = mount(
      app,
      (state) =>
        node('div', [
          node('p', 'Stopwatch'),

          node('div', {
            style: {
              fontSize: '24px',
              marginBottom: '10px',
            },
          }, (state.time / 10).toFixed(1) + ' seconds'),

          node('button', {
            click: (event, state) => {
              if (!state.timerInterval) {
                const timerInterval = setInterval(
                  () => state.time++,
                  100,
                )
                timerInterval.unref()
                state.timerInterval = timerInterval
              }
            },
            style: {
              marginRight: '10px',
            },
          }, 'Start'),
          node('button', {
            click: (event, state) => stopStopwatch(state),
            style: {
              marginRight: '10px',
            },
          }, 'Stop'),
          node('button', {
            click: (event, state) => {
              stopStopwatch(state)
              state.time = 0
            },
          }, 'Reset'),
        ]),
      {
        timerInterval: null,
        time: 0,
      },
    )

    assert.strictEqual(state.time, 0)

    const startButton = app.querySelector('button')
    const stopButton = app.querySelectorAll('button')[1]
    const resetButton = app.querySelectorAll('button')[2]

    startButton.click()
    await new Promise(resolve => setTimeout(resolve, 200))
    stopButton.click()

    assert.ok(state.time > 0)

    resetButton.click()
    assert.strictEqual(state.time, 0)
  })

  it('should handle tabs', async () => {
    const app = document.createElement('div')

    const [_update, _unmount, state] = mount(
      app,
      (state) =>
        node('div', {
          style: {
            maxWidth: '256px',
          },
        }, [
          node('div', state.tabs.map(
            (tab, index) =>
              node('button', {
                click: (event, state) => {
                  state.activeTab = index
                },
                type: 'button',
              }, tab.title),
          )),

          node('div', state.tabs[state.activeTab].content.map(
            paragraph => node('p', paragraph),
          )),
        ]),
      {
        activeTab: 0,
        tabs: [{
          title: 'Tab 1',
          content: [
            'Lorem ipsum dolor sit amet',
          ],
        }, {
          title: 'Tab 2',
          content: [
            'Praesent placerat ex metus',
          ],
        }],
      },
    )

    assert.strictEqual(state.activeTab, 0)
    assert.ok(app.textContent.includes('Lorem ipsum dolor sit amet'))

    const tab2Button = app.querySelectorAll('button')[1]
    tab2Button.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.activeTab, 1)
    assert.ok(app.textContent.includes('Praesent placerat ex metus'))
  })

  it('should handle task-list', async () => {
    const app = document.createElement('div')

    const [_update, _unmount, state] = mount(
      app,
      (state) => node(
        'div',
        {
          style: {
            maxWidth: '256px',
          },
        },
        [
          node('div', {
            style: {
              marginBottom: '16px',
            },
          }, [
            node(
              'input',
              {
                type: 'text',
                value: state.newtask,
                input: (
                  event,
                  state,
                ) => state.newtask = event.target.value,
                placeholder: 'Add a new task',
                style: {
                  width: '60%',
                  padding: '8px',
                  marginRight: '8px',
                },
              },
            ),
            node(
              'button',
              {
                click: (event, state) => {
                  if (state.newtask.trim()) {
                    state.tasks.push({
                      text: state.newtask,
                      completed: false,
                    })
                    state.newtask = ''
                  }
                },
                style: {
                  padding: '8px 12px',
                  cursor: 'pointer',
                },
              },
              'Add',
            ),
          ]),

          node(
            'ul',
            state.tasks.map(
              (task, index) => node('li', [
                node(
                  'button',
                  {
                    click: (event, state) => {
                      state.tasks.splice(index, 1)
                    },
                    type: 'button',
                  },
                  'X',
                ),

                node(
                  'span',
                  {
                    click: (event, state) => {
                      state.tasks[index].completed = !state.tasks[index].completed
                    },
                    style: {
                      textDecoration: task.completed
                        ? 'line-through'
                        : 'none',
                      cursor: 'pointer',
                      marginRight: '16px',
                    },
                  },
                  ' ' + task.text
                ),
              ])
            ),
          ),
        ],
      ),
      {
        newtask: '',
        tasks: [{
          text: 'Use task app',
          completed: false,
        }],
      },
    )

    assert.strictEqual(state.tasks.length, 1)
    assert.strictEqual(state.tasks[0].text, 'Use task app')

    const input = app.querySelector('input')
    const addButton = app.querySelector('button')

    input.value = 'New task'
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    addButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.tasks.length, 2)
    assert.strictEqual(state.tasks[1].text, 'New task')

    const taskSpan = app.querySelectorAll('span')[1] // Second span is the new task
    taskSpan.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.tasks[1].completed, true)
  })

  it('should handle temperature', async () => {
    const app = document.createElement('div')

    const [_update, _unmount, state] = mount(
      app,
      (state) =>
        node('div', {
          style: {
            maxWidth: '256px',
          },
        }, [
          node('p', 'Celsius converter'),

          node('input', {
            type: 'number',
            value: state.celsius,
            input: (
              event,
              state,
            ) => {
              state.celsius = event.target.value

              const celsius = parseFloat(event.target.value)
              state.fahrenheit = (celsius * 9 / 5 + 32).toFixed(2)
              state.kelvin = (celsius + 273.15).toFixed(2)
            },
            style: {
              marginBottom: '8px',
              padding: '4px',
              width: '100%',
            },
            placeholder: 'Enter Celsius',
          }),

          node('div', `Fahrenheit: ${state.fahrenheit}`),
          node('div', `Kelvin: ${state.kelvin}`),
        ]),
      {
        celsius: 0,
        fahrenheit: 32,
        kelvin: 273.15,
      },
    )

    assert.strictEqual(state.fahrenheit, 32)
    assert.strictEqual(state.kelvin, 273.15)

    const input = app.querySelector('input')

    input.value = '25'
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.fahrenheit, '77.00')
    assert.strictEqual(state.kelvin, '298.15')
  })

  it('should handle words', async () => {
    const app = document.createElement('div')

    const [_update, _unmount, state] = mount(
      app,
      (state) =>
        node('div', {
          style: {
            maxWidth: '256px',
          }
        }, [
          node('p', 'Word counter'),

          node('textarea', {
            placeholder: 'Type something...',
            input: (
              event,
              state,
            ) => {
              state.text = event.target.value
            },
            style: {
              width: '100%',
              minHeight: '8em',
              resize: 'vertical',
              padding: '8px',
            },
            value: state.text,
          }),

          node('p', 'Characters: ' + state.text.length),
          node('p', 'Words: ' + state.text.trim().split(/\s+/).filter(Boolean).length),
        ]),
      {
        text: 'Hello world how are you doing?',
      },
    )

    assert.strictEqual(state.text.length, 30)
    assert.strictEqual(state.text.trim().split(/\s+/).filter(Boolean).length, 6)

    const textarea = app.querySelector('textarea')

    textarea.value = 'New text here'
    textarea.dispatchEvent(new window.Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.text.length, 13)
    assert.strictEqual(state.text.trim().split(/\s+/).filter(Boolean).length, 3)
  })
})
