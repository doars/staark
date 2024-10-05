const SUFFIX_MULTIPLE: string = '[]'

export type MultipleAttributes = {
  multiple?: boolean,
  name?: string,
}

export const suffixNameIfMultiple = (
  attributes: MultipleAttributes,
) => {
  if (
    attributes.multiple
    && attributes.name
    && !attributes.name.endsWith(SUFFIX_MULTIPLE)
  ) {
    attributes.name += SUFFIX_MULTIPLE
  }
}
