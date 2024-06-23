import { iife } from '../../../.scripts/iife.js'

import { factory } from './library/factory.js'
import { fctory } from './library/fctory.js'
import { memo } from './library/memo.js'
import { mount } from './library/mount.js'
import { node } from './library/node.js'
import { nde } from './library/nde.js'
import { text } from './library/text.js'

iife([
  'staark',
], {
  factory,
  fctory,
  memo,
  mount,
  nde,
  node,
  text,
})
