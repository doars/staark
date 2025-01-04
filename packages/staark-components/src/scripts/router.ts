import {
  node as n,
  NodeContent,
  NodeAbstract,
} from '@doars/staark/src/index.js'

export type RouterOptions = {
  initial?: string
  // TODO:
}

// TODO: Listen to history changes.

export const router = (
  routes: Record<string, NodeContent[] | NodeContent>,
  state: Record<string, any>,
  options: RouterOptions = {},
): NodeAbstract => {
  state = Object.assign({
    route: options.initial ?? '',
  }, state)

  // TODO:

  return n('div')
}
