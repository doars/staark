import { iife } from '../../../.scripts/iife.js'

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
