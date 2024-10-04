import { iife } from '../../../.scripts/iife.js'

import { memo } from '@doars/staark/src/library/memo.js'
import { node } from '@doars/staark/src/library/node.js'
import { prepare } from './library/patch.js'

iife([
  'staark',
], {
  memo,
  node,
  prepare,
})
