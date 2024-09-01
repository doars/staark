import { iife } from '../../../.scripts/iife.js'

import * as array from './array.js'
import * as clone from './clone.js'
import * as compare from './compare.js'
import * as element from './element.js'
import * as identifier from './identifier.js'
import * as node from './node.js'

iife([
  'staark',
  'common',
], {
  array,
  clone,
  compare,
  element,
  identifier,
  node,
})
