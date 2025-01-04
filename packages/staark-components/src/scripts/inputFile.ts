import {
  node as n,
  NodeAbstract,
  NodeAttributeListener,
  // onCreated,
  suffixNameIfMultiple,
  uniqueIdentifier,
} from '@doars/staark-common'

const COMPONENT_CLASS = ' staark-component-file-input'

export type FileInputAttributes = {
  // Constants
  tabindex?: -1,
  type?: 'file',

  accepts?: string,
  class?: string | string[],
  hidden?: true,
  id?: string,
  multiple?: boolean,
  name?: string,
  value?: string,

  change?: NodeAttributeListener,
}

export const inputFile = (
  state: Record<string, any>,
  attributes: FileInputAttributes,
  label?: string,
): NodeAbstract[] => {
  state = Object.assign({
    files: [],
  }, state)

  attributes.class = (attributes.class || '') + COMPONENT_CLASS
  attributes.hidden = true
  if (!attributes.id) {
    attributes.id = ('file-input' + uniqueIdentifier())
  }
  attributes.tabindex = -1
  attributes.type = 'file'
  suffixNameIfMultiple(attributes)

  // TODO: Allow hooks to be placed on nodes that track the life cycle of the node. For instance when the element is created or destroyed.
  // onCreated(attributes.id, (
  //   event: CustomEvent,
  // ) => {
  //   if (
  //     event.detail.target
  //     && state.files
  //     && state.files.length > 0
  //   ) {
  //     const dataTransfer = new DataTransfer()
  //     for (let i = 0; i < state.files.length; i++) {
  //       dataTransfer.items.add(
  //         state.files[i],
  //       )
  //     }
  //     (event.detail.target as HTMLInputElement).files = dataTransfer.files
  //   }
  // })

  const onChange = attributes.change
  attributes.change = (
    event: Event,
  ) => {
    state.files = (event.target as HTMLInputElement).files
    if (onChange) {
      onChange(event)
    }
  }

  return [
    n('input', attributes),
    n('label', {
      for: attributes.id,

      dragover: (
        event: Event,
      ) => {
        event.preventDefault()
      },
      drop: (
        event: Event,
      ) => {
        event.preventDefault()

        state.files = (event as DragEvent).dataTransfer?.files
        if (onChange) {
          onChange(event)
        }
      },
    }, label || ''),
  ]
}
