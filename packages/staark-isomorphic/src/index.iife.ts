import { iife } from '../../../.scripts/iife.js'

import { factory } from '@doars/staark/src/library/factory.js'
import { fctory } from '@doars/staark/src/library/fctory.js'
import { memo } from '@doars/staark/src/library/memo.js'
import { node } from '@doars/staark/src/library/node.js'
import { nde } from '@doars/staark/src/library/nde.js'
import { stringify } from './library/stringify.js'
import { text } from '@doars/staark/src/library/text.js'

iife([
  'staark',
], {
  factory,
  fctory,
  memo,
  nde,
  node,
  stringify,
  text,
})
