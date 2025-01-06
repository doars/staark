import { iife } from '../../../.scripts/iife.js'

import * as array from './array.js'
import * as attribute from './attribute.js'
import * as clone from './clone.js'
import * as compare from './compare.js'
import * as conditional from './conditional.js'
import * as element from './element.js'
import * as factory from './factory.js'
import * as fctory from './fctory.js'
import * as identifier from './identifier.js'
import * as marker from './marker.js'
import * as match from './match.js'
import * as memo from './memo.js'
import * as nde from './nde.js'
import * as node from './node.js'
import * as text from './text.js'

iife([
  'staark',
  'common',
], {
  array,
  attribute,
  clone,
  compare,
  conditional,
  element,
  factory,
  fctory,
  identifier,
  marker,
  match,
  memo,
  nde,
  node,
  text,
})
