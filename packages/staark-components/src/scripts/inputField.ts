import {
  node as n,
  NodeAbstract,
  NodeAttributeListener,
  NodeAttributes,
  suffixNameIfMultiple,
  uniqueIdentifier,
} from '@doars/staark-common'

const COMPONENT_CLASS = ' staark-component-input'

export enum InputFieldTypes {
  checkbox = 'checkbox',
  color = 'color',
  date = 'date',
  datetimeLocal = 'datetime-local',
  email = 'email',
  file = 'file',
  month = 'month',
  number = 'number',
  password = 'password',
  radio = 'radio',
  range = 'range',
  search = 'search',
  tel = 'tel',
  text = 'text',
  time = 'time',
  url = 'url',
  week = 'week',
}

export type InputAttributes = {
  autocomplete?: string,
  accepts?: string,
  checked?: boolean,
  class?: string | string[],
  id?: string,
  max?: number,
  maxlength?: number,
  min?: number,
  minlength?: number,
  multiple?: boolean,
  name?: string,
  placeholder?: string,
  readonly?: boolean,
  step?: number,
  tabindex?: number,
  type?: InputFieldTypes,
  value?: string,

  change?: NodeAttributeListener,
  click?: NodeAttributeListener,
  focus?: NodeAttributeListener,
  keydown?: NodeAttributeListener,
  keyup?: NodeAttributeListener,
}

export type LabelOptions = {
  label: string,
  append?: boolean,
}

export const inputField = (
  state: Record<string, any>,
  attributes: InputAttributes,
  label?: string | LabelOptions,
): NodeAbstract[] => {
  state = Object.assign({
    value: attributes.value || '',
  }, state)

  attributes.class = (attributes.class || '') + COMPONENT_CLASS
  if (!attributes.type) {
    attributes.type = InputFieldTypes.text
  }
  attributes.value = state.value
  suffixNameIfMultiple(attributes)

  const onChange = attributes.change
  attributes.change = (
    event: Event,
  ) => {
    // TODO: What about the checkboxes and radio types.
    // TODO: What about the file type.
    state.value = (event.target as HTMLDataElement).value
    if (onChange) {
      onChange(event)
    }
  }

  if (typeof (label) === 'string') {
    label = {
      label: label,
    }
  }

  if (
    label
    && !label.append
    && (
      attributes.type === InputFieldTypes.checkbox
      || attributes.type === InputFieldTypes.radio
    )
  ) {
    label.append = true
  }

  const contents: NodeAbstract[] = [
    n('input', attributes),
  ]

  if (label) {
    if (!attributes.id) {
      attributes.id = 'auto-id' + uniqueIdentifier()
    }

    const labelAttributes: NodeAttributes = {
      for: attributes.id,
    }
    if (
      attributes.type === InputFieldTypes.checkbox
      || attributes.type === InputFieldTypes.radio
    ) {
      labelAttributes.tabindex = 0
      labelAttributes.click = (
        event: Event,
      ): void => {
        (
          (event.target as HTMLElement)
            .previousSibling as HTMLElement
        ).focus()
      }
    }
    const labelAbstract: NodeAbstract = n(
      'label',
      labelAttributes,
      label.label,
    )

    if (
      label
      && label.append
    ) {
      contents.push(labelAbstract)
    } else {
      contents.unshift(labelAbstract)
    }
  }

  return contents
}
