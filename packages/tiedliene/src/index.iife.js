import { iife } from '../../../helpers/iife.js'

import {
  cloneRecursive,
} from './utilities/clone.js'
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
  cloneRecursive,

  determineDiff,
  applyDiff,
  revertDiff,

  manageState,
})
