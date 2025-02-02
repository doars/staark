import { iife } from '../../../.scripts/iife.js'

import { conditional } from '@doars/staark-common/src/conditional.js'
import { factory } from '@doars/staark-common/src/factory.js'
import { fctory } from '@doars/staark-common/src/fctory.js'
import { identifier } from '@doars/staark-common/src/identifier.js'
import { match } from '@doars/staark-common/src/match.js'
import { memo } from '@doars/staark-common/src/memo.js'
import { nde } from '@doars/staark-common/src/nde.js'
import { node } from '@doars/staark-common/src/node.js'
import { mount } from './library/mount.js'

iife([
  'staark',
], {
  conditional,
  factory,
  fctory,
  identifier,
  match,
  memo,
  mount,
  nde,
  node,
})
