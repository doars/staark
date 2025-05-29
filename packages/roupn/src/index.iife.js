import { iife } from '../../../.scripts/iife.js'

import {
  createConnector,
  createSynchronizer,
} from './library/client.js'

iife([
  'roupn',
], {
  createConnector,
  createSynchronizer,
})
