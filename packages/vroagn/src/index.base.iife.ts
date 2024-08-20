import { iife } from '../../../.scripts/iife.js'

import { create } from './library/request.js'

iife([
  'vroagn',
], {
  create,
})
