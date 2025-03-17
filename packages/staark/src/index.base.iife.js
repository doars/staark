import { iife } from '../../../.scripts/iife.js'

import { memo } from '@doars/staark-common/src/memo.js'
import { node } from '@doars/staark-common/src/node.js'
import { mount } from './library/mount.js'

iife([
  'staark',
], {
  memo,
  mount,
  node,
})
