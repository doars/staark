import { GenericObject } from '@doars/staark-common/src/generics.js'
import {
  marker,
} from './marker.js'
import { NodeContent } from './node.js'

export type MemoFunction = (
  state: GenericObject<any>,
  memory: any,
) => NodeContent | NodeContent[]

export type MemoAbstract = {
  _: Symbol,
  // Compare data
  m: any,
  // Render function
  r: MemoFunction,
}

export const memo = (
  render: MemoFunction,
  memory: any,
) => ({
  _: marker,
  r: render,
  m: memory,
})
