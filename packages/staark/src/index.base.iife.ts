import { iife } from '../../../.scripts/iife.js'

import { memo } from './library/memo.js'
import { mount } from './library/mount.js'
import { node } from './library/node.js'

iife([
  'staark',
], {
  memo,
  mount,
  node,
})
