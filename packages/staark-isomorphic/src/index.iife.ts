import { iife } from '../../../.scripts/iife.js'

import { factory } from './library/factory.js'
import { fctory } from './library/fctory.js'
import { node } from './library/node.js'
import { nde } from './library/nde.js'
import { stringify } from './library/stringify.js'
import { text } from './library/text.js'

iife([
  'staark',
], {
  factory,
  fctory,
  nde,
  node,
  stringify,
  text,
})
