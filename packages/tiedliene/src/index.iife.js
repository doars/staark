import { iife } from '../../../.scripts/iife.js'

import {
  determineDiff,
  applyDiff,
  revertDiff,
} from './library/diff.js'
import {
  manageState,
} from './library/state.js'

iife([
  'tiedliene',
], {
  determineDiff,
  applyDiff,
  revertDiff,

  manageState,
})
