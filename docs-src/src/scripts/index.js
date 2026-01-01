import { mount, node as n } from '@doars/staark'

/**
 * Setup staark instance.
 */
const setup = (
) => {
  mount(
    document.getElementById('example-app'),
    (state) => n('div', [
      n('div', {
        class: 'text-2 font-900',
      }, 'List'),
      n('ol', {
        class: 'font-500 h-12 overflow-y-scroll',
      }, state.todos.map((todo) => n('li', {
          class: 'break-words',
        }, todo))),
      n('fieldset', {
        class: 'flex flex-nowrap flex-row group',
      }, [
        n('input', {
          class: 'flex-grow w-full flex-shrink',
          value: state.input,
          input: (event) => state.input = event.target.value,
        }),
        n('button', {
          class: 'border-l-0 flex-grow-0 flex-shrink-0',
          click: () => {
            if (state.input.trim()) {
              state.todos.push(state.input.trim())
              state.input = ''
            }
          },
        }, 'Add')
      ]),
    ]),
    { todos: ['Hello there!', 'General Kenobi.'], input: '' },
  )
}

// Setup when document is ready.
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setup()
} else {
  document.addEventListener('DOMContentLoaded', setup, { once: true, passive: true })
}

/**
 * Set a piece of text to the devices clipboard.
 * @param {string} text Text to set in the clipboard.
 */
window.copyToClipboard = (text) => {
  // Create element and set content.
  const element = document.createElement('textarea')
  element.value = text
  document.body.append(element)

  // Select element's content.
  element.select()
  element.setSelectionRange(0, 999999)

  // Copy to clipboard.
  document.execCommand('copy')

  // Remove element.
  element.remove()
}
