import { iife } from '../../../helpers/iife.js'

import {
  determineDiff,
  applyDiff,
  revertDiff,
} from './library/diff.js'

iife([
  'tiedliene',
], {
  determineDiff,
  applyDiff,
  revertDiff,
})
