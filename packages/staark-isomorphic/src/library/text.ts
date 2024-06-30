import {
  marker
} from './marker.js'

export type TextAbstract = {
  _: Symbol,
  // Contents
  c: string
}

export const text = (
  contents: number | string | (number | string)[],
): TextAbstract => ({
  _: marker,
  c: (
    Array.isArray(contents)
      ? contents.join('')
      : ('' + contents)
  ),
})
