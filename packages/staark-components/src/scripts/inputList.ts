import {
  node as n,
  NodeAbstract,
} from '@doars/staark/src/index.js'
import {
  inputField,
  InputAttributes,
  InputFieldTypes,
} from './inputField.js'

export type InputListItem = {
  id?: string,
  label?: string,
  value: string,
  search: string, // TODO: Search this as well as the label/value.
}

export type InputListOptions = {
  class?: string,
  id?: string,
  legend?: string,
  multiple?: boolean,
  name: string,

  selectAllLabel?: string,
  selected?: string[],
  selectedChange?: (argument: string[]) => unknown,
  selectNoneLabel?: string,

  preview: boolean,
  previewLabel?: string,
  previewPlaceholder?: string,

  search: boolean | number,
  searchChange?: (argument: string) => unknown,
  searchLabel?: string,
  searchPlaceholder?: string,
  searchResetLabel?: string,
  searchValue?: string,
}

// TODO: If the user has clicked on the input and starts typing, it should automatically enter into the search bar.
// TODO: The searching should still show all items, just hide the irrelivent ones.
// TODO: Add a select all or deselect all option.

export const inputList = (
  state: Record<string, any>,
  options: InputListOptions,
  items: InputListItem[],
): NodeAbstract => {
  // Prefill the state.
  state = Object.assign({
    query: options.searchValue,
    selected: options.selected ? [...options.selected] : [],
  }, state)

  let contents: NodeAbstract[] = []

  // Setup items.
  const inputOptions: InputAttributes = {
    appendLabel: true,
    multiple: options.multiple,
    name: options.name,
    type: options.multiple ? InputFieldTypes.checkbox : InputFieldTypes.radio,

    change: (
      event: Event,
    ): void => {
      // Keep the focus on the input element.
      // @ts-ignore
      (event as UIEvent).target.focus()

      const target: HTMLInputElement = event.target as HTMLInputElement
      if (!target.checked) {
        const index = state.selected.indexOf(target.value)
        if (index >= 0) {
          state.selected.splice(index, 1)
        }
      } else if (options.multiple) {
        if (state.selected.indexOf(target.value) < 0) {
          state.selected.push(target.value)
        }
      } else {
        state.selected = [target.value]
      }

      if (options.selectedChange) {
        options.selectedChange([...state.selected])
      }
    },
  }
  for (let i = 0; i < items.length; i++) {
    const item: InputListItem = items[i]
    // Check if item matches query.
    if (state.query && (
      (item.label && item.label.indexOf(state.query) < 0) ||
      item.value.indexOf(state.query) < 0
    )) {
      continue
    }

    const itemOptions: InputAttributes = {
      ...inputOptions,
      value: item.value,
    }
    if (state.selected.indexOf(item.value) >= 0) {
      itemOptions.checked = true
    }
    if (item.id) {
      itemOptions.id = item.id
    }
    contents.push(
      ...inputField(
        itemOptions,
        item.label ?? item.value, // TODO: When the label is clicked put the focus on the input element.
      ),
    )
  }

  if (options.selectNoneLabel && state.selected.length > 0) {
    contents.unshift(
      n('button', {
        click: (
        ): void => {
          state.selected = []

          if (options.selectedChange) {
            options.selectedChange([...state.selected])
          }
        },
        type: 'button',
      }, options.selectNoneLabel),
    )
  }

  if (options.selectAllLabel && state.selected.length !== items.length) {
    contents.unshift(
      n('button', {
        click: (
        ): void => {
          // Create list of all values.
          const selected: string[] = []
          for (const item of items) {
            state.selected.push(item.value)
          }
          state.selected = selected

          if (options.selectedChange) {
            options.selectedChange(selected)
          }
        },
        type: 'button',
      }, options.selectAllLabel),
    )
  }

  // Setup search input.
  if (options.search && (
    typeof (options.search) === 'boolean' ||
    items.length >= options.search
  )) {
    if (state.query) {
      contents.unshift(
        n('button', {
          click: (
            event: Event,
          ): void => {
            // Set focus to search field.
            // @ts-ignore
            (event as UIEvent).target.previousSibling.focus()

            state.query = null

            if (options.searchChange) {
              options.searchChange(state.query)
            }
          },
          type: 'button',
        }, options.searchResetLabel ?? '×'),
      )
    }

    const searchOptions: InputAttributes = {
      type: InputFieldTypes.search,
      value: state.query,

      keyup: (
        event: Event,
      ): void => {
        // @ts-ignore.
        state.query = event.target.value

        if (options.searchChange) {
          options.searchChange(state.query)
        }
      },
    }
    if (options.searchPlaceholder) {
      searchOptions.placeholder = options.searchPlaceholder
    }

    contents.unshift(
      ...inputField(searchOptions, options.searchLabel),
    )
  }

  contents = [
    n('div', {}, contents),
  ]

  if (options.preview) {
    const previewOptions: InputAttributes = {
      readonly: true,
      tabindex: -1,
      type: InputFieldTypes.text,
    }

    const labels: string[] = []
    for (const item of items) {
      if (state.selected.indexOf(item.value) >= 0) {
        labels.push(item.label ?? item.value)
      }
    }
    previewOptions.value = labels.join(', ')

    contents.unshift(
      ...inputField(previewOptions, options.previewLabel),
    )
  }

  if (options.legend) {
    contents.unshift(
      n('legend', {
        click: (
          event: Event,
        ): void => {
          // @ts-ignore
          event.target.parentNode.focus()
        },
      }, options.legend),
    )
  }

  const fieldAttributes: { [key: string]: any } = {
    tabindex: 0,
  }
  if (options.class) {
    fieldAttributes.class = options.class
  }
  return n('fieldset', fieldAttributes, contents)
}
