import {
  marker,
} from './marker.js'
import { NodeContent } from './node.js'

export type MemoFunction = (
  state: Record<string, any>,
  memory: any,
) => NodeContent[] | NodeContent

export type MemoAbstract = {
  _: string,
  // Compare data
  m: any,
  // Render function
  r: MemoFunction,
}

export const memo = (
  render: MemoFunction,
  memory: any,
): MemoAbstract => ({
  _: marker,
  r: render,
  m: memory,
})
