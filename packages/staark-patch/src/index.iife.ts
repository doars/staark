import { iife } from '../../../.scripts/iife.js'

import { factory } from '@doars/staark-common/src/factory.js'
import { fctory } from '@doars/staark-common/src/fctory.js'
import { nde } from '@doars/staark-common/src/nde.js'
import { node } from '@doars/staark-common/src/node.js'
import { text } from '@doars/staark-common/src/text.js'
import { prepare } from './library/patch.js'

iife([
  'staark',
], {
  factory,
  fctory,
  nde,
  node,
  prepare,
  text,
})
