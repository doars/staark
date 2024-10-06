import { iife } from '../../../.scripts/iife.js'

import { factory } from '@doars/staark-common/src/factory.js'
import { fctory } from '@doars/staark-common/src/fctory.js'
import { memo } from '@doars/staark-common/src/memo.js'
import { nde } from '@doars/staark-common/src/nde.js'
import { node } from '@doars/staark-common/src/node.js'
import { text } from '@doars/staark-common/src/text.js'
import {
  stringify,
  stringifyFull,
  stringifyPatch,
  stringifyPatchFull,
} from './library/stringify.js'

iife([
  'staark',
], {
  factory,
  fctory,
  memo,
  nde,
  node,
  stringify,
  stringifyFull,
  stringifyPatch,
  stringifyPatchFull,
  text,
})
