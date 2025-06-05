import { iife } from '../../../helpers/iife.js'

import { create } from './library/request.js'

iife([
  'vroagn',
], {
  create,
})
