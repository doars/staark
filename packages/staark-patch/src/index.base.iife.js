import { iife } from '../../../.scripts/iife.js'

import { node } from '@doars/staark-common/src/node.js'
import { prepare } from './library/patch.js'

iife([
  'staark',
], {
  node,
  prepare,
})
